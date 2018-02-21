'use strict';

const GlobalAttribute = require('./globalattribute.js').default;
const NetCDFVariable = require('./netcdfvariable.js').default;
const Branch = require('./branch.js').default;

const graphql = require('graphql-anywhere');
const gql = require('graphql-tag');

require('isomorphic-fetch');

require('es6-promise').polyfill();

const NetCDFReader = require('netcdfjs');
var ncGraphQL = function(data,options) {
	if(!data){
		throw new Error("data or URL required");
	}
	if(data instanceof Buffer || data.bytelength || data.byteLength){
		var reader = new NetCDFReader(data);
		this.analyze(reader);
	}else if(typeof data === 'string'){
		var url = data;
		var that = this;
		fetch(url,options).then(function(response) {
			return response.arrayBuffer? response.arrayBuffer() : response.buffer();
		}).then(function(data){
			var reader = new NetCDFReader(data);
			that.analyze(reader);
		}).catch(function(e){
			that.error = e;
		});
	}else{
		throw new Error("Expected a buffer data or a string url");
	}
};

ncGraphQL.prototype.analyze = function(netcdfreader) {
	this.reader = netcdfreader;
	this.variableMap = {};
	this.builtins = {
		ncdump: {
			materialize: function() {
				var copy = JSON.parse(JSON.stringify(this.reader.header));
				copy.variables.forEach(function(variable) {
					for (var i = 0; i < variable.dimensions.length; i++) {
						variable.dimensions[i] = copy.dimensions[variable.dimensions[i]].name;
					}
					delete variable.offset;
					delete variable.record;
				});
				return copy;
			}.bind(this)
		},
		graphql_example: {
			materialize: function() {
				var queries = {};
				var that = this;
				that.reader.header.variables.forEach(function(variable) {
					var parts = [];
					for (var i = 0; i < variable.dimensions.length; i++) {
						parts.push(that.reader.header.dimensions[variable.dimensions[i]].name);
					}
					parts.sort();
					var key = parts.join("_");
					queries[key] = queries[key] || parts;
					if(queries[key].indexOf(variable.name)<0){
						queries[key].push(variable.name);
					}
				});
				var graphql = ["{"];
				var keys = Object.keys(queries);
				keys.sort();
				keys.forEach(function(key){
					if(queries[key].length == 1 && queries[key][0] == key){
						return;
					}
					if(key.length) graphql.push("  "+key+"{")
					queries[key].forEach(function(v){
						graphql.push("    "+v);
					})
					if(key.length) graphql.push("  }");
				});
				graphql.push("}");

				return graphql.join("\n");
			}.bind(this)
		}
	};
	this.reader.globalAttributes.forEach(function(ga) {
		var sanitizedName = ga.name.replace(/\W+/g, "_");
		if (sanitizedName != ga.name) {
			ga.original_name = ga.name;
			ga.name = sanitizedName;
		}
		this.variableMap[ga.name] = new GlobalAttribute(ga);
	}.bind(this));
	this.reader.variables.forEach(function(v) {
		var sanitizedName = v.name.replace(/\W+/g, "_");
		if (sanitizedName != v.name) {
			v.original_name = v.name;
			v.name = sanitizedName;
		}
		this.variableMap[v.name] = new NetCDFVariable(this.reader, v);
	}.bind(this));
	var i = 0;
	this.reader.header.dimensions.forEach(function(d){
		d.index = i++;
	});

	return this;
}
ncGraphQL.prototype.resolverBuilder = function(fieldName, rootValue, args, context, info) {
	if (!info.isLeaf) {
		if (this.builtins[fieldName]) {
			var node = this.builtins[fieldName];
			if (rootValue) {
				if (rootValue.branches) {
					rootValue.branches.push(node);
				}
			} else {
				context[fieldName] = node;
			}
			return node;
		}
		var filters = [];
		if (args) {
			Object.keys(args).forEach(function(key) {
				var v = args[key];
				if (typeof v === 'object') {
					Object.keys(v).forEach(function(cond) {
						var limit = v[cond];
						switch (String(cond)) {
							case "min":
								filters.push(function(value) {
									return value[key] >= limit;
								})
								break;
							case "max":
								filters.push(function(value) {
									return value[key] <= limit;
								});
								break;
							default:
								console.log("unrecognised filter of " + key + " using " + cond)
						}
					});
				} else {
					filters.push(function(value) {
						return value[key] == v;
					});
				}
			});
		}

		var node = new Branch(fieldName, filters, this.reader, this.variableMap);
		if (rootValue) {
			if (rootValue.branches) {
				rootValue.branches.push(node);
			}
		} else {
			context[fieldName] = node;
		}
		return node;
	}
	if (this.variableMap[fieldName] !== undefined && this.variableMap[fieldName].dimensions) {
		this.variableMap[fieldName].dimensions.forEach(function(i) {
			rootValue.it.include(i);
		});
	} else if (this.variableMap[fieldName] !== undefined) {
		//hmmnn();
	}
	if (rootValue) {
		if (rootValue.fields) {
			rootValue.fields.push(fieldName);
		}
	} else {
		context[fieldName] = {
			materialize: function() {
				return this.variableMap[fieldName] === undefined ? this.builtins[fieldName] ? this.builtins[fieldName].materialize() : null : this.variableMap[fieldName].getValue();
			}.bind(this)
		};
	}
	return true;
}
ncGraphQL.prototype.analyse = ncGraphQL.prototype.analyze;

ncGraphQL.prototype._query = function(query,variables) {
	var self = this;
	return new Promise(function(resolve, reject) {
		try {
			if (typeof query === 'string') {
				query = gql(query);
			}
			var setupContext = {};
			const result = new graphql.default(
				self.resolverBuilder.bind(self),
				query,
				null,
				setupContext
			);

			var valuesContext = {};
			Object.keys(setupContext).forEach(function(key) {
				valuesContext[key] = setupContext[key].materialize();
			});

			const resolver = function(fieldName, root) {
				var v = root[fieldName];
				if (v && v.materialize && typeof v.materialize === "function") {
					return v.materialize();
				}
				return v === undefined? null: v;
			};

			var answer = new graphql.default(
				resolver,
				query,
				valuesContext,
				undefined,
				variables
			);
			resolve(answer);
		} catch (e) {
			reject(e);
		}
	});
}
ncGraphQL.prototype.query = function(query,variables) {
	var that = this;
	if(this.error){
		return new Promise(function(resolve,reject){
			reject(that.error);
		});
	}
	if(this.reader){
		return new Promise(function(resolve,reject){
			that._query(query,variables).then(resolve).catch(reject);
		});
	}
	return new Promise(function(resolve,reject){
		var timer = setInterval(function(){
			if(that.error){
				clearInterval(timer);
				reject(that.error);
			}else if(that.reader){
				clearInterval(timer);
				that._query(query,variables).then(resolve).catch(reject);
			}
		},50);
	});
}


module.exports = ncGraphQL;

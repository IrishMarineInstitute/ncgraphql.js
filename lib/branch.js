const DimensionsIterator = require('./dimensionsiterator.js').default;

var Branch = function(fieldName, filters, reader, variableMap) {
	this.fieldName = fieldName;
	this.fields = [];
	this.branches = [];
	this.filters = filters;
	this.it = new DimensionsIterator(reader);
	this.variableMap = variableMap;
}
Branch.prototype.accepts = function(value) {
	for (var i = 0; i < this.filters.length; i++) {
		if (!this.filters[i](value)) {
			return false;
		}
	}
	return true;
}

Branch.prototype.materialize = function(bindings) {
	var values = [];
	var branch = this;
	this.it.asArray(bindings).forEach(function(pointers) {
		var value = {};
		this.fields.forEach(function(fieldName) {
			var field = this.variableMap[fieldName];
			if(field){
				value[fieldName] = field.getValue(pointers);
			}else if(this.it.vars[fieldName] != undefined){
				value[fieldName] = pointers[this.it.vars[fieldName]];
			}else{
				value[fieldName] = undefined;
			}
		}.bind(this));
		this.branches.forEach(function(branch) {
			value[branch.fieldName] = branch.materialize(pointers);
		});
		if (this.accepts(value)) {
			values.push(value);
		}
	}.bind(this));
	return values;
}
exports.default = Branch;

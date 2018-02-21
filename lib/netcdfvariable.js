const cftime = require('./cftime.js');

var NetCDFVariable = function(netcdfreader, variable) {
	this.name = variable.name;
	this.dimensions = variable.dimensions;
	this.variable = variable;
	this.is_char = false;
	if(this.variable.type === 'char'){
		this.is_char = true;
		if(this.dimensions.length > 1){
			this.char_dimension = netcdfreader.header.dimensions[this.dimensions.pop()];
		}
	}
	this.netcdfreader = netcdfreader;
	this.data = netcdfreader.getDataVariable(this.name);
	if (variable.attributes && variable.attributes.length) {
		for (var i = 0; i < variable.attributes.length; i++) {
			if (variable.attributes[i].name == 'missing_value') {
				this.missing_value = variable.attributes[i].value;
				break;
			}
		}
	}
	//time convention
	if (this.name.match("time") && variable.attributes && variable.attributes.length) {
		var origin = null, unit = null;
		for (var i = 0; i < variable.attributes.length; i++) {
			if (variable.attributes[i].name == 'units' && (""+variable.attributes[i].value).match(" since ")) {
					this.cftime = new cftime.cftime(variable.attributes[i].value);
					break;
			}
			if (variable.attributes[i].name == 'unit') {
				unit = variable.attributes[i].value;
			}
			if (variable.attributes[i].name == 'origin') {
				origin = variable.attributes[i].value;
			}
		}
	}
	if(this.cftime === undefined && unit && origin){
		this.cftime = new cftime.cftime(unit + " since " + origin);
	}
}
NetCDFVariable.prototype._a2s = function(a){
	while(a.length > 0 && a[a.length-1] === 0 || a[a.length-1] === '\0'){
		a.pop();
	}
	return a.length == 0? null: a.join("");
}
NetCDFVariable.prototype._strim = function(v){
	return v==null?v:v.replace(/\0*/g, '');
}
NetCDFVariable.prototype._getRawValue = function(pointer) {
	if (this.dimensions.length == 0) {
		return this.data;
	}
	var value = this.data[pointer[this.dimensions[0]]];
	if (this.dimensions.length == 1) {
		if(this.char_dimension){
			var start = pointer[this.dimensions[0]]*this.char_dimension.size;
			value = this._a2s(this.data.slice(start,start+this.char_dimension.size));
		}else if(this.is_char){
			value = this._strim(value);
		}
		return value;
	}
	var i0 = 1;
	if(!Array.isArray(value)){ // not an array...
		i0 = 0;
		value = this.data;
	}
	// netcdfjs currently only supports two dimensions into the array.
	var x = 0;
	for (var i = i0; i < this.dimensions.length; i++) {
		var y = pointer[this.dimensions[i]];
		for (var j = i + 1; j < this.dimensions.length; j++) {
			y *= this.netcdfreader.header.dimensions[this.dimensions[j]].length;
		}
		x += y;
	}
	var result = value[x];
	if(this.char_dimension){
		x *= this.char_dimension.size;
		result = this._a2s(value.slice(x,x+this.char_dimension.size));
	}
	if (result === undefined) {
		throw new Error("missing " + this.name+"["+x+"]" + " with pointer " + pointer + " to " + this.dimensions + " (i0="+i0+"), data length is " + this.data.length + " dimensions, data[0]=" +(this.data.length?this.data[0]:"undefined")+(this.char_dimension?"char_dimension:"+JSON.stringify(this.char_dimension):"(not char)")+ JSON.stringify(this.netcdfreader.header.dimensions));
	}
	return result;
}

NetCDFVariable.prototype.getValue = function(pointer) {
	var raw_value = this._getRawValue(pointer);
	if (this.missing_value !== undefined && raw_value === this.missing_value) {
		return null;
	}
	if (this.cftime) {
		return this.cftime.toDate(raw_value);
	}
	return raw_value;
}

exports.default = NetCDFVariable;

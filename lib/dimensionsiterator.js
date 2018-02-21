var DimensionsIterator = function(netcdfreader) {
	this.netcdfreader = netcdfreader;
	this.dimensions = [];
	this._dimensions = [];
	this.vars = {};
}

DimensionsIterator.prototype.include = function(i) {
	if (this._dimensions.indexOf(i) < 0) {
		this.vars[this.netcdfreader.header.dimensions[i].name] = i;
		this._dimensions.push(i);
		var dim = {
			index: i,
			length: this.netcdfreader.header.dimensions[i].size,
		};
		if (dim.length == 0 && this.netcdfreader.header.dimensions[i].name == this.netcdfreader.header.recordDimension.name) {
			dim.length = this.netcdfreader.header.recordDimension.length;
		}
		this.netcdfreader.header.dimensions[i].length = dim.length;
		this.dimensions.push(dim);
	}
}
DimensionsIterator.prototype._realize = function(indices, fn) {
	for (var j = 0; j < indices.length; j++) {
		this.dimensions[j].pointer = indices[j];
	}
	fn.apply(null, [this.dimensions]);
}
DimensionsIterator.prototype._recurse = function(indices, key, index, bindings, realize, fn) {
	indices[key] = index;
	if (realize) {
		this._realize(indices, fn);
	} else {
		this._forEach(indices, bindings, fn);
	}
}
DimensionsIterator.prototype._forEach = function(indices, bindings, fn) {
	var k = indices.length;
	indices.push(0);
	var realize = k + 1 == this.dimensions.length;
	if (bindings === undefined || bindings[k] === undefined) {
		for (var i = 0; i < this.dimensions[k].length; i++) {
			this._recurse(indices, k, i, bindings, realize, fn);
		}
	} else {
		this._recurse(indices, k, bindings[k], bindings, realize, fn);
	}
	indices.pop();
}
DimensionsIterator.prototype.forEach = function(fn, bindings) {
	this._forEach([], bindings, fn);
}
DimensionsIterator.prototype.asArray = function(bindings) {
	var arr = [];
	this.forEach(function(indices) {
		var a = [];
		indices.forEach(function(x) {
			a[x.index] = x.pointer;
		})
		arr.push(a);
	}, bindings);
	return arr;
}
exports.default = DimensionsIterator;

var GlobalAttribute = function(v) {
	this.name = v.name;
	this.value = v.value;
}
GlobalAttribute.prototype.getValue = function() {
	return this.value;
}
exports.default = GlobalAttribute;

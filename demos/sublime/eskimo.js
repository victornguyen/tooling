
function Eskimo(name, type) {
	this.name = name || 'I don\'t have a name';
	this.type = type || 'Lazy';
    this.runCount = 0;
	this.lastMeal = null;
    return this;
}		

Eskimo.prototype.run = function(count) {
	this.runCount += count || 1
	return this;
};

	
var rob = new Eskimo('Hardcore', '.NET')

rob.run().run().run().run();

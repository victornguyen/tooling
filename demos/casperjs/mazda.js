
var casper = require('casper').create();

casper.start(
    'http://www.mazda.com.au/',
    function() {
        this.test.assertHttpStatus(200, 'mazda.com.au is up');
        this.test.assertTitle('Mazda Australia Zoom-Zoom - Mazda Australia', 'mazda homepage title is the one expected');
        this.test.assertSelectorExists('form', 'mazda.com.au has the gigantic form');
    }
);

casper.thenOpenAndEvaluate(
    'http://www.mazda.com.au/',
    function(fieldName, submitName, value) {
        document.querySelector('input[name="'+ fieldName +'"]').value = value;
        document.querySelector('input[name="'+ submitName +'"]').click();
    },
    {
        fieldName:  'ctl00$ctl01$ctl02$FindADealerBox',
        submitName: 'ctl00$ctl01$ctl02$FindADealerButton',
        value:      '3000'
    }
);

casper.then(function() {
    this.test.assertUrlMatch(/mazda-buying-tools/, 'dealer search has successfully taken place');
    this.test.assert( this.fetchText('h1') === 'City Mazda', 'dealer postcode search for 3000 returns "City Mazda"' );
});

casper.run(function() {
    this.test.renderResults(true);
});
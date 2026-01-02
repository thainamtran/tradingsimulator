const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

console.log('Instance created');

async function test() {
    try {
        const quote = await yahooFinance.quote('AAPL');
        console.log(quote);
    } catch (e) {
        console.error(e);
    }
}

test();

const yahooFinance = require('yahoo-finance2').default;

console.log('Yahoo Finance imported');

async function test() {
    try {
        const quote = await yahooFinance.quote('AAPL');
        console.log(quote);
    } catch (e) {
        console.error(e);
    }
}

test();

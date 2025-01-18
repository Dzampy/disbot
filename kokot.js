const axios = require("axios");

const fetchMarketCap = async (symbol) => {
  const apiUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=NP5bDkUhPdt2v6coMsMwLtfIWhlwREXb`;
  try {
    const response = await axios.get(apiUrl);
    if (response.data && response.data[0] && response.data[0].mktCap) {
      const marketCap = response.data[0].mktCap;
      return `$${(marketCap / 1e9).toFixed(2)}B`; // Převod na miliardy
    } else {
      console.log(`Market Cap nebyl nalezen pro symbol: ${symbol}`);
      return "N/A";
    }
  } catch (error) {
    console.error(`Chyba při načítání Market Cap pro ${symbol}:`, error.message);
    return "N/A";
  }
};

// Test
fetchMarketCap("AAPL").then((marketCap) => console.log("Market Cap:", marketCap));
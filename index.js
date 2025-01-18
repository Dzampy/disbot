const puppeteer = require("puppeteer");
const axios = require("axios");
const fs = require("fs");

// Discord webhook URL
const WEBHOOK_URL = "https://discord.com/api/webhooks/1330076955990560788/_zibchDJv93BU9dZEl-4Li5yr0yU7HnG66b5K6iiI6LdUzNTGCYQcnbaIJl4sdzx_tVG";

// Soubor pro ukládání odeslaných novinek
const SENT_NEWS_FILE = "sentNews.json";

// Načítáme seznam odeslaných novinek ze souboru
let sentNews = new Set();
if (fs.existsSync(SENT_NEWS_FILE)) {
  const rawData = fs.readFileSync(SENT_NEWS_FILE, "utf-8");
  sentNews = new Set(JSON.parse(rawData));
  console.log(`Načteny již odeslané novinky (${sentNews.size}):`);
} else {
  console.log("Soubor sentNews.json neexistuje, vytvářím nový seznam.");
}

// Funkce pro analýzu sentimentu
const analyzeSentiment = (text) => {
  const lowerText = text.toLowerCase();
  const positiveKeywords = ["growth", "increase", "profit", "record", "success", "approval"];
  const negativeKeywords = ["decline", "loss", "fail", "bankruptcy", "drop", "crash"];

  for (const word of positiveKeywords) {
    if (lowerText.includes(word)) return "Positive";
  }
  for (const word of negativeKeywords) {
    if (lowerText.includes(word)) return "Negative";
  }
  return "Neutral";
};

// Funkce pro analýzu dopadu
const analyzeImpact = (text) => {
  const lowerText = text.toLowerCase();
  const highImpactKeywords = ["record", "major", "significant", "breakthrough", "acquisition"];
  const mediumImpactKeywords = ["update", "improvement", "moderate"];
  const lowImpactKeywords = ["minor", "small", "low"];

  for (const word of highImpactKeywords) {
    if (lowerText.includes(word)) return "High";
  }
  for (const word of mediumImpactKeywords) {
    if (lowerText.includes(word)) return "Medium";
  }
  return "Low";
};

// Funkce pro získání Market Cap pomocí API
const fetchMarketCap = async (symbol) => {
  const apiUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=NP5bDkUhPdt2v6coMsMwLtfIWhlwREXb`;
  try {
    const response = await axios.get(apiUrl);
    if (response.data && response.data[0] && response.data[0].mktCap) {
      const marketCap = response.data[0].mktCap;
      return `$${(marketCap / 1e9).toFixed(2)}B`; // Převod na miliardy
    }
  } catch (error) {
    console.error(`Chyba při načítání Market Cap pro ${symbol}:`, error.message);
  }
  return "N/A";
};


async function fetchLatestNews() {
  console.log("\n=== Spouštím kontrolu novinek ===");

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    console.log("Načítám stránku...");
    await page.goto("https://www.stocktitan.net/news/live.html", {
      waitUntil: "networkidle2",
    });

    console.log("Načítám obsah stránky...");
    const newsArray = await page.evaluate(() => {
      const newsElements = document.querySelectorAll("div.news-row");
      const newsArray = [];

      newsElements.forEach((newsElement) => {
        const titleElement = newsElement.querySelector("a.feed-link");
        const imageElement = newsElement.querySelector("img");
        const categoryElement = newsElement.querySelector(".category");
        const symbolElement = newsElement.querySelector("a.symbol-link.notranslate");

        if (titleElement && titleElement.href) {
          let imageUrl = imageElement
            ? imageElement.getAttribute("src")
            : "https://via.placeholder.com/600x300.png?text=Stock+Titan+News";

          if (!imageUrl.startsWith("https://")) {
            imageUrl = `https://www.stocktitan.net${imageUrl}`;
          }

          newsArray.push({
            title: titleElement.textContent.trim(),
            url: `https://www.stocktitan.net${titleElement.getAttribute("href")}`,
            image: imageUrl,
            category: categoryElement ? categoryElement.textContent.trim() : "General",
            symbol: symbolElement ? symbolElement.textContent.trim() : "N/A",
          });
        }
      });

      return newsArray;
    });

    console.log(`Načteno ${newsArray.length} novinek:`);
    const newNews = newsArray.filter((news) => !sentNews.has(news.url));

    console.log(`Nových novinek k odeslání: ${newNews.length}`);

    for (const news of newNews.reverse()) {
      console.log(`Odesílám novinku: ${news.title} (${news.url})`);

      const sentiment = news.sentiment || analyzeSentiment(news.title);
      const impact = news.impact || analyzeImpact(news.title);
      const marketCap = news.marketCap || await fetchMarketCap(news.symbol);

      const message = {
        username: "Stock Titan Bot",
        avatar_url: "https://www.stocktitan.net/favicon.ico",
        embeds: [
          {
            author: {
              name: `${news.symbol}`,
              url: news.url,
              icon_url: news.image,
            },
            title: `📂 ${news.title}`,
            url: news.url,
            description: "Klikněte na odkaz níže pro více informací.",
            color: sentiment === "Positive" ? 3066993 : sentiment === "Negative" ? 15158332 : 16776960,
            fields: [
              { name: "🪙 Symbol akcie", value: news.symbol, inline: true },
              { name: "📂 Kategorie", value: news.category, inline: true },
              { name: "📈 Sentiment", value: sentiment, inline: true },
              { name: "📊 Dopad", value: impact, inline: true },
              { name: "💰 Market Cap", value: marketCap, inline: true },
              { 
                name: "📊 TradingView Graf", value: news.symbol !== "N/A" 
                  ? `[Zobrazit graf](https://www.tradingview.com/symbols/${news.symbol}/)`
                  : "N/A", 
                inline: true 
              },
            ],
            image: { url: news.image },
            footer: {
              text: "Powered by Stock Titan | Vždy aktuální novinky",
              icon_url: "https://www.stocktitan.net/favicon.ico",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await axios.post(WEBHOOK_URL, message);
      sentNews.add(news.url);
    }

    fs.writeFileSync(SENT_NEWS_FILE, JSON.stringify(Array.from(sentNews), null, 2));
    console.log("Seznam odeslaných novinek byl aktualizován.");
  } catch (error) {
    console.error("Chyba při zpracování novinek:", error.message);
  } finally {
    await browser.close();
    console.log("=== Kontrola dokončena ===\n");
  }
}

// Spouštíme kontrolu každou minutu
setInterval(fetchLatestNews, 60000);
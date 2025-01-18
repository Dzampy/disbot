const puppeteer = require("puppeteer");
const axios = require("axios");
 
// Discord webhook URL
const WEBHOOK_URL = "https://discord.com/api/webhooks/1330076955990560788/_zibchDJv93BU9dZEl-4Li5yr0yU7HnG66b5K6iiI6LdUzNTGCYQcnbaIJl4sdzx_tVG";
 
async function fetchLatestNews() {
  console.log("Načítám poslední dvě novinky...");
 
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
 
  try {
    // Načtení stránky
    await page.goto("https://www.stocktitan.net/news/live.html", {
      waitUntil: "networkidle2", // Počká na načtení všech dat
    });
 
    // Získáme HTML obsahu
    const html = await page.content();
    const $ = require("cheerio").load(html);
 
    // Najdeme první dvě novinky
    const newsElements = $("a.feed-link").slice(0, 2); // Vybereme první 2 odkazy
    const newsArray = [];
 
    newsElements.each((index, element) => {
      const title = $(element).text().trim(); // Titulek
      const url = $(element).attr("href"); // Odkaz
 
      if (title && url) {
        newsArray.push({ title, url: `https://www.stocktitan.net${url}` }); // Přidáme URL k základu webu
      }
    });
 
    // Kontrola, zda byly nalezeny novinky
    if (newsArray.length === 0) {
      console.log("Nebyly nalezeny žádné novinky.");
      return;
    }
 
    // Posíláme každou novinku na Discord
    for (const news of newsArray) {
      const message = {
        username: "Stock Titan Bot",
        content: `📰 **Novinka:**\n**${news.title}**\n🔗 [Více zde](${news.url})`,
      };
 
      await axios.post(WEBHOOK_URL, message);
      console.log(`Novinka odeslána: ${news.title}`);
    }
  } catch (error) {
    console.error("Chyba při zpracování nebo odesílání novinky:", error.message);
  } finally {
    await browser.close();
  }
}
 
fetchLatestNews();
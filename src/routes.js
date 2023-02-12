import { createPuppeteerRouter } from 'crawlee';

export const router = createPuppeteerRouter();

export function sleepFor(sleepDuration){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){}
}

async function scrollDown(page) {
    let originalOffset = 0;

    while (true) {
        await page.evaluate('window.scrollBy(0, document.body.scrollHeight)');
        sleepFor(2000);
        let newOffset = await page.evaluate('window.pageYOffset');
        if (originalOffset === newOffset) {
            break;
        }
        originalOffset = newOffset;
    }
}

router.addDefaultHandler(async ({ request, page, log }) => {
    await page.waitForXPath('//*[@id="__next"]/div[1]/main[1]/section[1]/aside[1]/nav[1]/ul[1]/li');

    const [alimentos] = await page.$x('//*[@id="__next"]/div[1]/main[1]/section[1]/aside[1]/nav[1]/ul[1]/li[contains(., "Alimentos Básicos")]/a[1]');

    const url = request.url;

    await Promise.all([
        await alimentos.click(),
    ]);

    await scrollDown(page);
    
    const dataProdutos = await page.evaluate((idMercado, data) => {
        const prods = Array.from(document.querySelectorAll('div#__next > div > main > section > main > div:nth-of-type(2) > section > div'));
        return prods.map(td => {
            const nomeProduto = td.querySelector('a > span').textContent.replace("'", "");
            var precoProduto = td.querySelector('a > div.product-card__price').textContent;
            precoProduto = RegExp('R\\$ ([0-9\\.]+,[0-9]+)').exec(precoProduto);
            precoProduto = precoProduto ? precoProduto[1].replace(".", "").replace(",", ".") : "0.0";
            
            return {
                id_mercado: idMercado,
                nome: nomeProduto,
                preco: parseFloat(precoProduto),
                data_captura: data
            };
        });
    }, mercados.get(url), dtNow);

    const database = clientDB.db("ifood");
    const produtos = database.collection("produtos");

    produtos.insertMany(dataProdutos);
});
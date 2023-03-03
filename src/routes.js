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

function getPromiseData(el, selector) {
    return el.$eval(selector, el => el.textContent).then(function(result) {
        return result;
    });
}

router.addDefaultHandler(async ({ request, page, log }) => {
    await page.waitForXPath('//*[@id="__next"]/div[1]/main[1]/section[1]/aside[1]/nav[1]/ul[1]/li');

    const [alimentos] = await page.$x('//*[@id="__next"]/div[1]/main[1]/section[1]/aside[1]/nav[1]/ul[1]/li[contains(., "Alimentos Básicos")]/a[1]');

    const url = request.url;

    await Promise.all([
        await alimentos.click(),
    ]);

    await scrollDown(page);

    const dataProdutosXPath = await page.$x("/html/body/div[2]/div[1]/main/section/main/div[3]/section/div");

    const dataProdutos = await Promise.all(dataProdutosXPath.map(async (e) => {
        var precoProduto = await getPromiseData(e, "a.product-card-content > div.product-card__price");
        const nomeProduto = await getPromiseData(e, "a.product-card-content > span.product-card__description");

        precoProduto = RegExp('R\\$ ([0-9\\.]+,[0-9]+)').exec(precoProduto);
        precoProduto = precoProduto ? precoProduto[1].replace(".", "").replace(",", ".") : "0.0";
        return {
            id_mercado: mercados.get(url),
            nome: nomeProduto,
            preco: parseFloat(precoProduto),
            data_captura: dtNow
        }
    }));

    const database = clientDB.db("ifood");
    const produtos = database.collection("produtos");

    if (dataProdutos.length > 0) {
        produtos.insertMany(dataProdutos);
    }
});
import { PuppeteerCrawler } from 'crawlee';
import { router } from './routes.js';
import { MongoClient } from 'mongodb';
import moment from 'moment';
import 'moment-timezone';
import { argv } from 'node:process';

const crawler = new PuppeteerCrawler({
    requestHandler: router,
    headless: true
});

global.dtNow = moment.utc(moment.tz('America/Sao_Paulo').format('YYYY-MM-DDTHH:mm:ss')).toDate();

const mongoURI = argv[2];
const mercadoID = parseInt(argv[3]) || null;

global.clientDB = new MongoClient(mongoURI);

const query = mercadoID ? { id: mercadoID } : {};

const database = clientDB.db("ifood");
const mercadosCol = database.collection("mercados");
const cursor = mercadosCol.find(query);

global.mercados = new Map();

var linksIfood = [];

await cursor.forEach(function(doc) {
    linksIfood.push(doc.link_ifood);
    mercados.set(doc.link_ifood, doc.id);
});

await crawler.run(linksIfood);

await clientDB.close();
# NodeJS getting products prices from iFood markets

This project is developing with `PuppeteerCrawler`.

### Libs:
- [Moment JS](https://momentjs.com/)
- [MongoDB NodeJS](https://www.mongodb.com/docs/drivers/node/current/)
- [Crawlee](https://crawlee.dev/)

### Get started:

1. Create database in mongoDB as named `ifood`.
2. Create collection in database `ifood` as named `mercados`.
    - Create documents like below:
    ```json
    {
        "id" : 1,
        "nome" : "Super Prixs",
        "cidade" : "Rio de Janeiro",
        "bairro" : "Maracanã",
        "link_ifood" : "https://www.ifood.com.br/delivery/rio-de-janeiro-rj/super-prix---maracana-maracana"
    }
    ```
3. Create collection in database `ifood` as named `produtos`.

### Run crawler:
```python
npm start <str:MONGODB_URI_CONN> <int:ID_MERCADO:optional>
```

P.S.: Get products of all `mercados` collection if not passed argument ID_MERCADO.

### To analyze prices of same product in all markets (aggregate framework):
```js
[
  {
    $group:
      {
        _id: {
          nome: "$nome",
          id_mercado: "$id_mercado",
        },
        preco: {
          $max: "$preco",
        },
      },
  },
  {
    $lookup:
      {
        from: "mercados",
        localField: "_id.id_mercado",
        foreignField: "id",
        as: "mercado",
      },
  },
  {
    $replaceRoot:
      {
        newRoot: {
          _id: ObjectId(),
          nome: "$_id.nome",
          cidade_mercado: {
            $arrayElemAt: ["$mercado.cidade", 0],
          },
          bairro_mercado: {
            $arrayElemAt: ["$mercado.bairro", 0],
          },
          nome_mercado: {
            $arrayElemAt: ["$mercado.nome", 0],
          },
          preco: "$preco",
        },
      },
  },
  {
    $match:
      {
        //nome: /.*Óleo de Soja Soya 900ml.*/
        nome: /.*Feijao Carioca Vapza 500g.*/,
      },
  },
  {
    $sort:
      {
        preco: 1,
      },
  },
]
```

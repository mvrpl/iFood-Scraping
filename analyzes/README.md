# Analyzes iFood data

### Getting same product on multiple markets:

![Analysis 01](https://github.com/mvrpl/iFood-Scraping/blob/main/analyzes/TabelaProdutosMultiMercados.png?raw=true)

```python
import pymongo
import pandas as pd
from itables import show

client = pymongo.MongoClient("MONGO_DB_URI")["ifood"]

result = client["produtos"].aggregate(
    [
        {"$group": {"_id": {"nome": "$nome"}}},
        {
            "$lookup": {
                "from": "produtos",
                "localField": "_id.nome",
                "foreignField": "nome",
                "as": "mercado",
            }
        },
        {"$set": {"item": {"$setDifference": ["$mercado.id_mercado", []]}}},
        {
            "$replaceRoot": {
                "newRoot": {
                    "produto": "$_id.nome",
                    "mercados": "$item",
                    "arr_len": {"$size": "$item"},
                }
            }
        },
        {"$match": {"arr_len": {"$gt": 5}}},
        {"$sort": {"arr_len": -1}},
    ]
)

df = pd.DataFrame(list(result))

show(df)
```

### Comparing prices for the same product across multiple markets:

![Analysis 02](https://github.com/mvrpl/iFood-Scraping/blob/main/analyzes/PreçosProdutosPorMercados.png?raw=true)

```python
import pandas as pd
from bson.regex import Regex
import plotly.express as px
import pymongo

conn = pymongo.MongoClient("MONGO_DB_URI")["ifood"]

produtos = "|".join(
    [
        "Pipoca Micro Yoki Popcorn 100g C\/ Sal",
        "Farofa Pronta Yoki Temperada 500g",
        "Pipoca de Microondas Popcorn Manteiga de Cinema Yoki 100g",
        "Adoçante Sacarina Zero Cal 100ml",
        "Milho Pipoca Yoki Premium 500g",
        "Pipoca Micro Yoki Popcorn 100g Natural",
        "Óleo de Soja Soya 900ml",
        "Pipoca Micro Yoki Popcorn 100g Toque Chef",
        "Pipoca de Microondas Popcorn Sabor Manteiga Yoki 100g",
        "Acucar Refinado Uniao 1kg",
        "Macarrão Barilla Spaghetti N5 500g",
        "Macarrão com Ovos Barilla Penne 500g",
        "Arroz Branco T1 Camil 1kg",
        "Açucar União Demerara 1kg"
    ]
)

pipeline = [
    {
        "$group": {
            "_id": {
                "nome": "$nome",
                "id_mercado": "$id_mercado",
            },
            "data_captura": {
                "$max": "$data_captura",
            },
            "preco": {"$last": "$preco"},
        },
    },
    {
        "$lookup": {
            "from": "mercados",
            "localField": "_id.id_mercado",
            "foreignField": "id",
            "as": "mercado",
        },
    },
    {
        "$replaceRoot": {
            "newRoot": {
                "nome": "$_id.nome",
                "data_captura": "$data_captura",
                "cidade_mercado": {
                    "$arrayElemAt": ["$mercado.cidade", 0],
                },
                "bairro_mercado": {
                    "$arrayElemAt": ["$mercado.bairro", 0],
                },
                "nome_mercado": {
                    "$arrayElemAt": ["$mercado.nome", 0],
                },
                "preco": "$preco",
            },
        },
    },
    {
        "$match": {
            "nome": Regex(produtos),
        },
    },
    {
        "$sort": {
            "preco": pymongo.ASCENDING,
        },
    },
]

cursor = conn["produtos"].aggregate(pipeline)

df = pd.DataFrame(list(cursor))

df["mercado_cidade"] = (
    df["nome_mercado"] + " - " + df["cidade_mercado"] + " - " + df["bairro_mercado"]
)

df['data_captura'] = pd.to_datetime(df['data_captura']).dt.strftime('%d/%m/%Y %H:%M:%S')

fig = px.bar(
    df,
    x="mercado_cidade",
    color="nome",
    y="preco",
    labels={
        "mercado_cidade": "Mercado",
        "nome": "Produto",
        "preco": "Preço",
        "data_captura": "Data Captura"
    },
    hover_data=["data_captura"],
    title="Preços por mercados",
    barmode="group",
    height=800,
)
fig.update_layout(yaxis_tickprefix = 'R$ ')
fig.update_layout(barmode="group", xaxis={"categoryorder": "total descending"})
fig.show()
```

### Timeline of price changes for the product in the same market:

![Analysis 03](https://github.com/mvrpl/iFood-Scraping/blob/main/analyzes/TimelinePreçosProdutosPorMercado.png?raw=true)

```python
import pymongo
import pandas as pd
import plotly.express as px

client = pymongo.MongoClient("MONGO_DB_URI")["ifood"]

result = client["produtos"].aggregate(
    [
        {
            "$group": {
                "_id": {"nome": "$nome", "id_mercado": "$id_mercado"},
                "precos": {"$push": "$preco"},
                "data_captura": {"$push": "$data_captura"},
            }
        },
        {
            "$lookup": {
                "from": "mercados",
                "localField": "_id.id_mercado",
                "foreignField": "id",
                "as": "mercado",
            }
        },
        {
            "$replaceRoot": {
                "newRoot": {
                    "nome": "$_id.nome",
                    "id_mercado": "$_id.id_mercado",
                    "nome_mercado": {"$arrayElemAt": ["$mercado.nome", 0]},
                    "cidade_mercado": {"$arrayElemAt": ["$mercado.cidade", 0]},
                    "bairro_mercado": {"$arrayElemAt": ["$mercado.bairro", 0]},
                    "precos": "$precos",
                    "data_captura": "$data_captura",
                }
            }
        },
        {
            "$project": {
                "nome": "$nome",
                "id_mercado": "$id_mercado",
                "nome_mercado": "$nome_mercado",
                "cidade_mercado": "$cidade_mercado",
                "bairro_mercado": "$bairro_mercado",
                "precos": {"$zip": {"inputs": ["$precos", "$data_captura"]}},
            }
        },
        {"$unwind": "$precos"},
        {
            "$project": {
                "nome": "$nome",
                "id_mercado": "$id_mercado",
                "nome_mercado": "$nome_mercado",
                "cidade_mercado": "$cidade_mercado",
                "bairro_mercado": "$bairro_mercado",
                "preco": {"$arrayElemAt": ["$precos", 0]},
                "data_captura": {"$arrayElemAt": ["$precos", 1]},
            }
        }
    ]
)

df = pd.DataFrame(list(result))

df = df.query("id_mercado == 1") # Change ID of market to analysis.

df['preco_ant'] = df['preco'].shift()
df['preco_diff'] = (df['preco'] - df['preco'].shift()).map('{:+,.2f}'.format, na_action='ignore')
df['preco_percent'] = ((abs(df['preco'] - df['preco'].shift()) / df['preco'].shift()) * 100.0).map('{:,.2f}'.format, na_action='ignore')

data_mercado = df.iloc[0].to_dict()

fig = px.line(
    df,
    x="data_captura",
    y="preco",
    color="nome",
    markers=True,
    labels={
        "data_captura": "Data Captura",
        "nome": "Produto",
        "preco": "Preço",
    },
    custom_data=['nome', 'preco_diff', 'preco_percent', 'preco_ant'],
    title=f"Preços produtos em [{data_mercado.get('nome_mercado')} - {data_mercado.get('cidade_mercado')} - {data_mercado.get('bairro_mercado')}]",
    height=800,
)
fig.update_layout(barmode="group", xaxis={"categoryorder": "total descending"})
fig.update_traces(showlegend=False)
fig.update_layout(yaxis_tickprefix = 'R$ ')
fig.update_traces(
    hovertemplate="<br>".join([
        "Data captura: %{x}",
        "Preço: %{y}",
        "Mudança preço: R$ %{customdata[1]} (Antes: R$ %{customdata[3]})",
        "Porcentagem de mudança preço: %{customdata[2]}%"
    ])
)

for i, col in enumerate(fig.data):
    chg = fig.data[i].customdata[0]
    fig.data[i].customdata[0] = [chg[0], '0.00', '0.00', 0]

fig.update_layout(
    updatemenus=[
        {
            "buttons": [
                {
                    "label": m,
                    "method": "update",
                    "args": [
                        {
                            "visible": [
                                True if m == "Selecione o produto..." else t.name == m
                                for t in fig.data
                            ]
                        }
                    ],
                }
                for m in ["Selecione o produto..."] + sorted(list(map(lambda d: d.name, fig.data)))
            ],
            'type':'dropdown',
            "direction": "down",
            "showactive": True
        }
    ]
)
fig.show()
```
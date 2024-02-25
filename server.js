import { Point,InfluxDB } from "@influxdata/influxdb-client"
import fs from "fs"
import mqtt from "mqtt"
import express from "express"
import cors from "cors"
// const express = require('express')
const app = express()
// const db = require('./db.json')
// const cors = require('cors')
const dbFiles = fs.readFileSync('./db.json','utf-8')
const corsOption = {
    origin: '*'
}

const db = JSON.parse(dbFiles)

app.get('/currentdb',cors(corsOption),(req,res)=>{
    res.json(db)
})
const token = process.env.INFLUXDB_TOKEN
const url = process.env.INFLUXDB_URL
const org = process.env.INFLUXDB_ORG
const bucket = process.env.INFLUXDB_BUCKET
let querydb = []
console.log(url)

// console.log(process.env.INFLUXDB_URL)

// const influxdb = new InfluxDB({url,token})
// const writeApi = influxdb.getWriteApi(org, bucket)

// writeApi.useDefaultTags({ Line: '1' })
// let i = 0
// while(i+1 < db.length){
// const point1 = new Point(`Bus ${db[i].busid}`)
//   .tag('Station', db[i].station)
//   .intField('in', db[i].in)
// console.log(` ${point1}`)
// const point2 = new Point(`Bus ${db[i].busid}`)
//   .tag('Station', db[i].station)
//   .intField('out', db[i].out)
// console.log(` ${point2}`)
// // const point3 = new Point(`Bus ${db[i].busid}`)
// //   .tag('Station', db[i].station)
// //   .intField('out', db[i].out)
// writeApi.writePoint(point1)
// writeApi.writePoint(point2)
// // writeApi.writePoint(point3)
// i+= 1
// }

const queryApi = new InfluxDB({url, token}).getQueryApi(org)

const fluxQuery =
    `from(bucket: "${bucket}")
    |> range(start: 0)
    |> filter(fn: (r) => r._measurement == "Bus 1")`

const myQuery = async () => {
    for await (const { values,tableMeta} of queryApi.iterateRows(fluxQuery)) {
      const o = tableMeta.toObject(values)
      console.log(
        `${o._time} ${o._measurement} (${o.Station}): ${o._field}=${o._value}`
      )
      // console.log((new Date(o._time).toLocaleString('en-GB',{hourCycle: "h24"})))
      querydb.push(o)
    }
}

// writeApi.close().then(() => {
//     console.log('WRITE FINISHED')
//   })

await myQuery()

app.get('/db',cors(corsOption),(req,res)=>{
  res.json(querydb)
})

app.listen(3000, () =>
    console.log('Start server at port 3000.'))
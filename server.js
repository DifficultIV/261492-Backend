import { Point, InfluxDB } from "@influxdata/influxdb-client"
import fs from "fs"
import mqtt from "mqtt"
import express from "express"
import cors from "cors"
const app = express()
const dbFiles = fs.readFileSync('./db.json', 'utf-8')
const dbFiles2 = fs.readFileSync('./dbnew.json', 'utf-8')
const corsOption = {
  origin: '*'
}
const latitude = [100, 200, 300, 400]
const longitude = [200, 300, 400, 500]
const db = JSON.parse(dbFiles)
let db2 = JSON.parse(dbFiles2)
console.log(db)

for (let i = 0; i < latitude.length; i++) {
  if (db2.length <= i) {
    break;
  }
  if (db2[i].location.latitude <= latitude[i] && db2[i].location.longitude <= longitude[i]) {
    db[i].in = db2[i].data.enter
    db[i].out = db2[i].data.exit
    db[i].current = db2[i].data.current
  }
}

console.log(db)
// app.get('/currentdb', cors(corsOption), (req, res) => {
//   res.json(db)
// })
const token = process.env.INFLUXDB_TOKEN
const url = process.env.INFLUXDB_URL
const org = process.env.INFLUXDB_ORG
const bucket = process.env.INFLUXDB_BUCKET
let querydb = []
let sortdb = []

const influxdb = new InfluxDB({ url, token })
const writeApi = influxdb.getWriteApi(org, bucket)

// writeApi.useDefaultTags({ Line: '1' })
// let i = 0
// while(i+1 <= db.length){
//   console.log(db[i].station)
// const point1 = new Point(`Bus ${db[i].busid}`)
//   .tag('Station', db[i].station)
//   .intField('in', db[i].in)
// console.log(` ${point1}`)
// const point2 = new Point(`Bus ${db[i].busid}`)
//   .tag('Station', db[i].station)
//   .intField('out', db[i].out)
// console.log(` ${point2}`)
// const point3 = new Point(`Bus ${db[i].busid}`)
//   .tag('Station', db[i].station)
//   .intField('current', db[i].current)
//   console.log(` ${point3}`)
// writeApi.writePoint(point1)
// writeApi.writePoint(point2)
// writeApi.writePoint(point3)
// i+= 1
// }

const queryApi = new InfluxDB({ url, token }).getQueryApi(org)

let fluxQuery =
  `from(bucket: "${bucket}")
    |> range(start: 0)
    |> filter(fn: (r) => r._measurement == "Bus 1")`


const myQuery = async () => {
  for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
    const o = tableMeta.toObject(values)
    // console.log(
    //   `${o._time} ${o._measurement} (${o.Station}): ${o._field}=${o._value}`
    // )
    querydb.push(o)
  }
}

writeApi.close().then(() => {
  console.log('WRITE FINISHED')
})

await myQuery()

for (const data of querydb) {
  const time = new Date(data._time).toLocaleString('en-GB', { hourCycle: "h24" })
  const time_split = time.split(", ")
  const sortindex = sortdb.findIndex(obj => obj.date == time_split[0] && obj.time == time_split[1])
  if (sortindex != -1) {
    if (data._field == "in") {
      sortdb[sortindex].in = data._value
    } else if (data._field == "out") {
      sortdb[sortindex].out = data._value
    } else if (data._field == "current") {
      sortdb[sortindex].current = data._value
    }
  } else {
    if (data._field == "in") {
      sortdb.push({
        busid: data._measurement,
        station: data.Station,
        date: time_split[0],
        time: time_split[1],
        in: data._value,
        out: 0,
        current: 0
      })
    } else if (data._field == "out") {
      sortdb.push({
        busid: data._measurement,
        station: data.Station,
        date: time_split[0],
        time: time_split[1],
        in: 0,
        out: data._value,
        current: 0
      })
    } else if (data._field == "current") {
      sortdb.push({
        busid: data._measurement,
        station: data.Station,
        date: time_split[0],
        time: time_split[1],
        in: 0,
        out: 0,
        current: data._value
      })
    }

  }

}
console.log(sortdb)
// app.get('/db',cors(corsOption),(req,res)=>{
//   res.json(querydb)
// })

// app.listen(3000, () =>
//     console.log('Start server at port 3000.'))
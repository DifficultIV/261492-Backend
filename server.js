import { Point, InfluxDB } from "@influxdata/influxdb-client"
import fs from "fs"
import mqtt from "mqtt"
import express from "express"
import cors from "cors"
import { randomInt } from "crypto"
const app = express()
// const dbFiles = fs.readFileSync('./db.json', 'utf-8')
// const dbFiles2 = fs.readFileSync('./dbnew.json', 'utf-8')
const token = process.env.INFLUXDB_TOKEN
const url = process.env.INFLUXDB_URL
const org = process.env.INFLUXDB_ORG
const bucket = process.env.INFLUXDB_BUCKET
const influxdb = new InfluxDB({ url, token })
const corsOption = {
  origin: '*'
}
let count = 0
let oldIn = randomInt(12)
let oldOut = randomInt(12)
let current = Math.max()
let newIn = Math.max()
let newOut = Math.max()
let lastTime = "0"
let stationi = 0
// while (oldIn - oldOut < 0) {
//   oldIn = randomInt(12)
//   oldOut = randomInt(12)
// }
const location = [[18.799102, 18.799718, 98.952356, 98.953035], //อาคารปฏิบัติการกลางคณะวิทยาศาสตร์
[18.802831, 18.803373, 98.950374, 98.950902], //สำนักหอสมุด
[18.803762, 18.804201, 98.948889, 98.949302], //อาคาร HB7 คณะมนุษยศาสตร์
[18.806269, 18.806886, 98.951641, 98.952284], //โรงอาหารคณะมนุษยศาสตร์
[18.804150, 18.804694, 98.953735, 98.954204], //ลานจอดรถ อ่างแก้ว
[18.802544, 18.802828, 98.955161, 98.955708], //ไปรษณีย์
[18.801084, 18.801630, 98.956380, 98.956938], //โรงอาหารคณะรัฐศาสตร์ (ตรงข้าม)
[18.801410, 18.802017, 98.951053, 98.951527]] //""
const stationdb = ["อาคารปฏิบัติการกลางคณะวิทยาศาสตร์",
  "สำนักหอสมุด",
  "อาคาร HB7 คณะมนุษยศาสตร์",
  "โรงอาหารคณะมนุษยศาสตร์",
  "ลานจอดรถ อ่างแก้ว",
  "ไปรษณีย์",
  "โรงอาหารคณะรัฐศาสตร์ (ตรงข้าม)",
  ""]

let db = JSON.parse(fs.readFileSync('./db.json', 'utf-8'))
oldIn = db[0].in
oldOut = db[0].out
current = db[0].current
let allstationdb = JSON.parse(fs.readFileSync('./allstationdb.json', 'utf-8'))
let sendlocation = []

for (let i = 0; i < location.length; i++) {
  sendlocation.push({
    station_id: i,
    start_lat: location[i][0],
    end_lat: location[i][1],
    start_lon: location[i][2],
    end_lon: location[i][3]
  })
}

app.get('/location', cors(corsOption), (req, res) => {
  res.json(sendlocation)
  console.log(sendlocation)
})

const client = mqtt.connect("mqtt://128.199.248.64", {
  username: 'Client',
  password: 'NotExactlyClient'
})

client.on("connect", () => {
  client.subscribe("bus")
});

client.on("message", (topic, message) => {
  const messageparse = JSON.parse(message.toString())
  console.log(messageparse)
  const writeApi = influxdb.getWriteApi(org, bucket)
  writeApi.useDefaultTags({ Line: '3' })
  for (let i = 0; i < location.length; i++) {
    if ((messageparse.location.latitude >= location[i][0] && messageparse.location.latitude <= location[i][1]) && (messageparse.location.longitude >= location[i][2] && messageparse.location.longitude <= location[i][3])) {
      const time = new Date(messageparse.time).toLocaleString('en-GB', { hourCycle: "h24" })
      const time_split = time.split(", ")
      db = [{
        busid: messageparse.id,
        station: stationdb[i],
        date: time_split[0],
        time: time_split[1],
        in: Math.abs(messageparse.data.enter - oldIn),
        out: Math.abs(messageparse.data.exit - oldOut),
        current: messageparse.data.current
      }]
      const data = JSON.stringify(db)
      fs.writeFileSync("db.json", data, (error) => {
        if (error) {
          console.error(error)
        }
      })
      const sortIndex = allstationdb.findIndex(obj => (obj.station == stationdb[i]))
      if (sortIndex != -1) {
        allstationdb[sortIndex].busid = db[0].busid
        allstationdb[sortIndex].station = db[0].station
        allstationdb[sortIndex].date = db[0].date
        allstationdb[sortIndex].time = db[0].time
        allstationdb[sortIndex].in = db[0].in
        allstationdb[sortIndex].out = db[0].out
        allstationdb[sortIndex].current = db[0].current
      } else {
        allstationdb.push(db)
      }
      const allstationdata = JSON.stringify(allstationdb)
      fs.writeFileSync("allstationdb.json", allstationdata, (error) => {
        if (error) {
          console.error(error)
        }
      })
      const point1 = new Point(`Bus`)
        .tag('busid', db[0].busid)
        .tag('datestamp', time_split[0])
        .tag('timestamp', time_split[1])
        .tag('Station', db[0].station)
        .intField('in', db[0].in)
      console.log(` ${point1}`)
      const point2 = new Point(`Bus`)
        .tag('busid', db[0].busid)
        .tag('datestamp', time_split[0])
        .tag('timestamp', time_split[1])
        .tag('Station', db[0].station)
        .intField('out', db[0].out)
      console.log(` ${point2}`)
      const point3 = new Point(`Bus`)
        .tag('busid', db[0].busid)
        .tag('datestamp', time_split[0])
        .tag('timestamp', time_split[1])
        .tag('Station', db[0].station)
        .intField('current', db[0].current)
      console.log(` ${point3}`)
      writeApi.writePoint(point1)
      writeApi.writePoint(point2)
      writeApi.writePoint(point3)
      writeApi.close().then(() => {
        console.log('WRITE FINISHED')
      })
      break
    }


  }
});


app.get('/currentdb', cors(corsOption), (req, res) => {
  res.json(db)
  console.log(db)
})

let querydb = []
let sortdb = []


const queryApi = new InfluxDB({ url, token }).getQueryApi(org)
let fluxQuery =
  `from(bucket: "${bucket}")
    |> range(start: 0)
    |> filter(fn: (r) => r._measurement == "Bus")
    |> group()
    |> limit(n: 20,offset: 0)
    `

let fluxCountQuery =
  `from(bucket: "${bucket}")
    |> range(start: 0)
    |> filter(fn: (r) => r._measurement == "Bus")
    |> group(columns: ["_field"])
    |> count()
      `

const countQuery = async () => {
  count = 0
  for await (const { values, tableMeta } of queryApi.iterateRows(fluxCountQuery)) {
    const o = tableMeta.toObject(values)
    // console.log(
    //   `${o.datestamp} ${o.timestamp} ${o._measurement} ${o.busid} (${o.Station}): ${o._field}=${o._value}`
    // )
    count += o._value
    console.log(count)
  }
}

const myQuery = async () => {
  querydb = []
  for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
    const o = tableMeta.toObject(values)
    // console.log(
    //   `${o.datestamp} ${o.timestamp} ${o._measurement} ${o.busid} (${o.Station}): ${o._field}=${o._value}`
    // )
    // console.log(o.Line)
    querydb.push(o)
  }
}


// await myQuery()
// await countQuery()
// console.log(count)
const sortQuery = () => {
  sortdb = []
  for (const data of querydb) {
    const sortindex = sortdb.findIndex(obj => obj.date == data.datestamp && obj.time == data.timestamp)
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
          date: data.datestamp,
          time: data.timestamp,
          line: data.Line,
          in: data._value,
          out: 0,
          current: 0
        })
      } else if (data._field == "out") {
        sortdb.push({
          busid: data._measurement,
          station: data.Station,
          date: data.datestamp,
          time: data.timestamp,
          line: data.Line,
          in: 0,
          out: data._value,
          current: 0
        })
      } else if (data._field == "current") {
        sortdb.push({
          busid: data._measurement,
          station: data.Station,
          date: data.datestamp,
          time: data.timestamp,
          line: data.Line,
          in: 0,
          out: 0,
          current: data._value
        })
      }

    }

  }
}


// console.log(sortdb)
app.get('/recorddb', cors(corsOption), async (req, res) => {
  let page = req.query.pages
  lastTime = req.query.time
  if (page == undefined || page < 1) {
    page = 1
  }
  if (lastTime == undefined) {
    fluxQuery =
    `from(bucket: "${bucket}")
    |> range(start: 0)
    |> filter(fn: (r) => r._measurement == "Bus")
    |> group()
    |> limit(n: 60,offset: ${(page - 1) * 60})
    `
  }
  else{
      fluxQuery =
    `from(bucket: "${bucket}")
    |> range(start: 0)
    |> filter(fn: (r) => r._measurement == "Bus")
    |> filter(fn: (r) => r._datestamp == "${lastTime}")
    |> group()
    |> limit(n: 60,offset: ${(page - 1) * 60})
    `
  }
  console.log(page)
  await myQuery()
  sortQuery()
  console.log(sortdb.length)
  res.json(sortdb)
})

app.get('/db', cors(corsOption), async (req, res) => {
  res.json(allstationdb)
})

app.get('/count', cors(corsOption), async (req, res) => {
  await countQuery()
  let i = Math.ceil(count / 60)
  res.json({
    counts: count,
    page: i
  })
})
app.listen(3000, () =>
  console.log('Start server at port 3000.'))
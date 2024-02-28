import { Point, InfluxDB } from "@influxdata/influxdb-client"
import fs from "fs"
import mqtt from "mqtt"
import express from "express"
import cors from "cors"
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
const location = [[18.799084, 18.799365, 98.952515, 98.952855], //อาคารปฏิบัติการกลางคณะวิทยาศาสตร์
[18.803066, 18.803286, 98.950466, 98.950718], //สำนักหอสมุด
[18.803823, 18.804014, 98.949050, 98.949195], //อาคาร HB7 คณะมนุษยศาสตร์
[18.806294, 18.806603, 98.951940, 98.952177], //โรงอาหารคณะมนุษยศาสตร์
[18.804234, 18.804512, 98.953841, 98.954105], //ลานจอดรถ อ่างแก้ว
[18.802537, 18.802728, 98.955369, 98.955631], //ไปรษณีย์
[18.801196, 18.801443, 98.956621, 98.956847], //โรงอาหารคณะรัฐศาสตร์ (ตรงข้าม)
[18.801511, 18.801781, 98.951125, 98.951366]] //""
const stationdb = ["อาคารปฏิบัติการกลางคณะวิทยาศาสตร์",
  "สำนักหอสมุด",
  "อาคาร HB7 คณะมนุษยศาสตร์",
  "โรงอาหารคณะมนุษยศาสตร์",
  "ลานจอดรถ อ่างแก้ว",
  "ไปรษณีย์",
  "โรงอาหารคณะรัฐศาสตร์ (ตรงข้าม)",
  ""]
let db = [
  {
    busid: "",
    station: "Station 1",
    date: "",
    time: "",
    in: 0,
    out: 1,
    current: 2
  }
]
let allstationdb = [
  {
    busid: "",
    station: "Station 1",
    date: "",
    time: "",
    in: 0,
    out: 1,
    current: 2
  },
  {
    busid: "",
    station: "Station 2",
    date: "",
    time: "",
    in: 0,
    out: 1,
    current: 2
  },
  {
    busid: "",
    station: "Station 3",
    date: "",
    time: "",
    in: 0,
    out: 1,
    current: 2
  },
]
let sendlocation = []

for(let i = 0; i < location.length; i++){
  sendlocation.push({
    station: stationdb[i],
    start_x: location[i][0],
    end_x: location[i][1],
    start_y: location[i][2],
    end_y: location[i][3]
  })
}
console.log(sendlocation)

app.get('/location', cors(corsOption), (req, res) => {
  res.json(sendlocation)
  console.log(sendlocation)
})

const client = mqtt.connect("mqtts://11ba1af485354ff08eec334f40b97712.s1.eu.hivemq.cloud", {
  username: '261492',
  password: 'Proj_492'
})

client.on("connect", () => {
  client.subscribe("test")
});

client.on("message", (topic, message) => {
  const messageparse = JSON.parse(message.toString())
  console.log(messageparse)
  const writeApi = influxdb.getWriteApi(org, bucket)
  writeApi.useDefaultTags({ Line: '1' })
  for (let i = 0; i < location.length; i++) {
    if ((messageparse.location.latitude >= location[i][0] && messageparse.location.latitude <= location[i][1]) && (messageparse.location.longitude >= location[i][2] && messageparse.location.longitude <= location[i][3])) {
      const time = new Date(messageparse.time).toLocaleString('en-GB', { hourCycle: "h24" })
      const time_split = time.split(", ")
      db = [{
        busid: messageparse.id,
        station: stationdb[i],
        date: time_split[0],
        time: time_split[1],
        in: messageparse.data.enter,
        out: messageparse.data.exit,
        current: messageparse.data.current
      }]
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
    |> group()
    |> filter(fn: (r) => r._measurement == "Bus")
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
  if (page == undefined || page < 1) {
    page = 1
  }
  console.log(page)
  fluxQuery =
    `from(bucket: "${bucket}")
    |> range(start: 0)
    |> group()
    |> filter(fn: (r) => r._measurement == "Bus")
    |> limit(n: 60,offset: ${(page - 1) * 60})
    `
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
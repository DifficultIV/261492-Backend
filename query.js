// import { InfluxDB, Point } from '@influxdata/influxdb-client'

// const token = process.env.INFLUXDB_TOKEN
// const url = process.env.INFLUXDB_URL
// const org = process.env.INFLUXDB_ORG
// const bucket = process.env.INFLUXDB_BUCKET
// let test = []
// const queryApi = new InfluxDB({url, token}).getQueryApi(org)

// const fluxQuery =
//     `from(bucket: "${bucket}")
//     |> range(start: 0)
//     |> filter(fn: (r) => r._measurement == "Bus 1")`

// const myQuery = async () => {
//     for await (const { values,tableMeta} of queryApi.iterateRows(fluxQuery)) {
//       var o = tableMeta.toObject(values)
//       console.log(
//         `${o._time} ${o._measurement} (${o.Station}): ${o._field}=${o._value}`
//       )
//       test.push(o)
//     }
// }

// await myQuery()


// console.log(test)

import mqtt from "mqtt"
const client = mqtt.connect("mqtts://11ba1af485354ff08eec334f40b97712.s1.eu.hivemq.cloud",{
username: '261492',
password: 'Proj_492'
})

client.on("connect", () => {
  client.subscribe("test")
});

client.on("message", (topic, message) => {
  // console.log(`Received message on topic ${topic}: ${message}`)
  // console.log(message.toString())
  const test = JSON.parse(message.toString())  
  // message.toString()
  console.log(test.data.enter)
});



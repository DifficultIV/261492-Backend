import { InfluxDB, Point } from '@influxdata/influxdb-client'

const token = process.env.INFLUXDB_TOKEN
const url = process.env.INFLUXDB_URL
const org = process.env.INFLUXDB_ORG
const bucket = process.env.INFLUXDB_BUCKET
let test = []
const queryApi = new InfluxDB({url, token}).getQueryApi(org)

const fluxQuery =
    `from(bucket: "${bucket}")
    |> range(start: 0)
    |> filter(fn: (r) => r._measurement == "Bus 1")`

const myQuery = async () => {
    for await (const { values,tableMeta} of queryApi.iterateRows(fluxQuery)) {
      var o = tableMeta.toObject(values)
      console.log(
        `${o._time} ${o._measurement} (${o.Station}): ${o._field}=${o._value}`
      )
      test.push(o)
    }
}

await myQuery()


console.log(test)
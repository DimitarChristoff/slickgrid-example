import numeral from 'numeral';
import fecha from 'fecha';
import 'numeral/min/locales.min';
import _ from 'lodash';
import React from 'react'
import ReactDOM from 'react-dom'
import { Sparklines, SparklinesLine, SparklinesReferenceLine, SparklinesSpots } from 'react-sparklines'

numeral.locale('en-gb');

const makeArrayFactory = () =>{
  function *helper(count, cb){
    for (let i = 0; i < count; i++) yield cb(i)
  }

  return (length, indiceGenerator = index => index) => ([...helper(length, indiceGenerator)])
}

const amountFormatter = (r, c, value) => `<div class="${value < 500 ? 'green' : 'red'}">${numeral(value).format('$ 0,000.00')}</div>`
const pipFormatter = (r, c, value, cd, dataContext) =>{
  return `<div class='${dataContext.direction}'>${numeral(value).format('0.0000')}</div>`;
}
const imageFormatter = (r, c, value) => `<img src="${value}" />`;
const dateFormatter = (r, c, value) => fecha.format(new Date(value), 'D/MM/YYYY');
const totalFormatter = (r, c, value, cd, {price, amount}) => numeral(price*amount).format('$ 0,000.00')
const healthFormatter = (r, c, value) => {
  const className = value > 66 ? 'danger' : ''
  return `<progress value="${value}" max="100" class="${className}">${value}</progress>`
}
const countryFormatter = (r, c, value) => {
  const val = value.substr(0, 2).toLocaleLowerCase()
  return `<span class="flag-icon flag-icon-${val}"></span> ${value}`
}

const style = { stroke: "black", fill: "none" }
const dummy = document.createElement('div')
const historicSyncFormatter = (r, c, value) => {
  dummy.innerHTML = ''
  ReactDOM.render(<Sparklines data={value} limit={15} width={128} height={30} margin={0}>
    <SparklinesLine style={style} />
    <SparklinesReferenceLine />
    <SparklinesSpots />
  </Sparklines>, dummy)
  const html = dummy.innerHTML
  ReactDOM.unmountComponentAtNode(dummy)
  return html
}

const historicFormatter = (node, row, data) => {
  ReactDOM.render(<Sparklines data={data.historic} limit={15} width={128} height={20} margin={0}><SparklinesLine style={style} /></Sparklines>, node[0]);
}


const makeArray = makeArrayFactory()

const rates = {
  "AUD": 1.7443,
  "CAD": 1.7643,
  "CHF": 1.2963,
  "JPY": 146.4,
  "USD": 1.2854,
  "EUR": 1.1836
}

const morphRate = (symbol, noSave) =>{
  const rate = rates[symbol];
  const diff = rate / 100 * _.random(0.01, 0.25);
  const newRate = _.random(0, 1) ? rate + diff : rate - diff;
  noSave || (rates[symbol] = newRate)
  return newRate
}

export {
  makeArray,
  amountFormatter,
  imageFormatter,
  dateFormatter,
  pipFormatter,
  totalFormatter,
  historicFormatter,
  historicSyncFormatter,
  healthFormatter,
  countryFormatter,
  rates,
  morphRate
}

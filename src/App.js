import React                                                      from 'react';
import ReactDOM                                                   from 'react-dom';
import {FrozenGrid as Grid, Editors, Plugins, Data}   from 'slickgrid-es6';
import Faker                                                      from 'faker';
import _                                                          from 'lodash'
import Dimensions                                                 from 'react-dimensions'
import {
    makeArray,
    amountFormatter,
    pipFormatter,
    //imageFormatter,
    //historicFormatter,
    historicSyncFormatter,
    dateFormatter,
    totalFormatter,
    healthFormatter,
    countryFormatter,
    rates,
    morphRate
} from './lib/utils';

const checkboxSelector = new Plugins.CheckboxSelectColumn({
    cssClass: "slick-cell-checkboxsel"
});

const options = {
    rowHeight: 32,
    editable: true,
    enableAddRow: !true,
    enableCellNavigation: true,
    // asyncEditorLoading: false,
    enableAsyncPostRender: true,
    autoEdit: false,
    forceFitColumns: true,
    showHeaderRow: true,
    headerRowHeight: 32,
    explicitInitialization: true
};

const columnFilters = {};
let healthValue = 0

// data view
const dv = new Data.DataView();
dv.setFilter(item => {
    let pass = true;

    for (let key in item){
        pass = pass && item.health >= healthValue
        if (key in columnFilters && columnFilters[key].length && key !== 'health'){
            pass = pass && String(item[key]).match(new RegExp(columnFilters[key], 'ig'));
        }
    }
    return pass;
});

dv.getItemMetadata = index => {
    const row = dv.getItem(index);
    return row.type === 'BUY' ? {cssClasses: 'buy'} : {cssClasses: ''}
}
// end data view


// column definitions
const sortable = true;
const columns = [
    checkboxSelector.getColumnDefinition(),
    {
        id: 'type',
        name: 'Side',
        sortable,
        field: 'type',
        maxWidth: 120,
    },
    {id: 'counterparty', name: 'Counterparty', field: 'counterparty', minWidth: 200, maxWidth: 200, cssClass: 'slick-editable', editor: Editors.Text, sortable},
    {id: 'currency',
        name: 'GBP-nnn',
        field: 'currency',
        minWidth: 90,
        maxWidth: 90,
        sortable,
        formatter: countryFormatter,
    },
    {
        id: 'price',
        name: 'Price',
        field: 'price',
        headerCssClass: 'amount',
        cssClass: 'amount',
        formatter: pipFormatter,
        minWidth: 100,
        maxWidth: 100
    },
    {
        id: 'historic',
        name: 'Historic',
        field: 'historic',
        rerenderOnResize: true,
        //asyncPostRender: historicFormatter,
        formatter: historicSyncFormatter,
        // formatter: (a,b, value) => JSON.stringify(value),
        // formatter: historicFormatter,
        cssClass: 'full-size',
        minWidth: 128,
        maxWidth: 128
    }, {
        id: 'amount',
        name: 'Amount',
        field: 'amount',
        headerCssClass: 'amount',
        cssClass: 'amount slick-editable',
        formatter: amountFormatter,
        editor: Editors.Text,
        minWidth: 100,
        maxWidth: 100
    },
    {
        id:'total',
        name:'Total',
        fieldName:'total',
        headerCssClass: 'amount',
        cssClass: 'amount',
        formatter: totalFormatter,
        sortable: false,
        minWidth: 100,
        maxWidth: 128
    },
    {
        id: 'paymentDate',
        sortable: true,
        name: 'Execution',
        field: 'paymentDate',
        minWidth: 100,
        maxWidth: 100,
        cssClass: 'slick-editable amount',
        headerCssClass: 'amount',
        //todo: fix date picker as it goes off-screen
        editor: Editors.Date,
        options: {
            date: {
                dateFormat: 'd/m/Y', // see https://chmln.github.io/flatpickr/#options,
                parseDate: input => {
                    const split = input.split('/')
                    return new Date(`${split[1]}-${split[0]}-${split[2]}`)
                }
            }
        }
    },
    {id: 'health', name: 'Health', field: 'health', cssClass: 'is-hidden-mobile', headerCssClass: 'is-hidden-mobile', formatter: healthFormatter, sortable: true},
];

// fake data
dv.setItems(makeArray(300, id => {
    const currency = _.sample(['USD','AUD','CAD','EUR','JPY','CHF']);
    const data = {
        id,
        avatar: Faker.image.avatar(),
        type: _.sample(['BUY','SELL']),
        counterparty: Faker.company.companyName(),
        health: _.random(0, 100),
        currency,
        amount: Faker.finance.amount(),
        price: rates[currency],
        paymentDate: dateFormatter(null, null, Faker.date.future())
    };

    data.historic = [data.price]
    return data
}));

// filter renderer is a react component
class Filter extends React.Component {

    handleChange = ({target}) => {
        const value = target.value.trim()
        if (value.length){
            this.props.columnFilters[this.props.columnId] = value;
        }
        else {
            delete this.props.columnFilters[this.props.columnId]
        }

        this.props.dv.refresh()
    }

    render(){
        return <input defaultValue={this.props.columnFilters[this.props.columnId]} type='text' className='editor-text' onChange={this.handleChange} />
    }
}

// main!
class Home extends React.Component {

    rates = Object.keys(rates)

    historic = this.rates.reduce((acc, cur) => {
        acc[cur] = [rates[cur]]
        return acc
    }, {})

    handleResize = () => {
        this.gridInstance.setColumns(columns)
    }

    state = {
        editing: null
    }

    componentDidMount(){
        const grid = this.gridInstance = new Grid(this.grid, dv, columns, options);
        columns[7].formatter = columns[7].formatter.bind(this.gridInstance)

        grid.setSelectionModel(new Plugins.RowSelectionModel({selectActiveRow: false}));
        grid.registerPlugin(checkboxSelector);

        const changeFilter = _.debounce(value => {
            healthValue = value
            dv.refresh()
        }, 500)

        grid.onHeaderRowCellRendered.subscribe((e, {node, column}) => {
            if (['_checkbox_selector', 'historic', 'health'].indexOf(column.id) === -1){
                ReactDOM.render(<Filter columnId={column.id} columnFilters={columnFilters} dv={dv} />, node);
                node.classList.add('slick-editable');
            }
            else if (column.id === 'health') {
                ReactDOM.render(<input className="range" defaultValue={healthValue} type="range" onChange={e => changeFilter(e.target.value)} />, node)
            }
            else {
                node.classList.add('slick-uneditable');
            }
            if (column.id === '_checkbox_selector'){
                node.innerHTML = '<i class="fa fa-filter" />';
            }
        });

        grid.onSort.subscribe(function(e, args) {
            // args.multiColumnSort indicates whether or not this is a multi-column sort.
            // If it is, args.sortCols will have an array of {sortCol:..., sortAsc:...} objects.
            // If not, the sort column and direction will be in args.sortCol & args.sortAsc.

            // We'll use a simple comparer function here.
            const comparer = function(a, b) {
                return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
            }

            // Delegate the sorting to DataView.
            // This will fire the change events and update the grid.
            dv.sort(comparer, args.sortAsc);
        });

        dv.onRowCountChanged.subscribe(() => {
            grid.updateRowCount();
            grid.render();
        });

        grid.onBeforeEditCell.subscribe((e, {item}) => {
            this.setState({editing: item});
        });

        grid.onBeforeCellEditorDestroy.subscribe(() => this.setState({editing: null}));

        grid.onCellChange.subscribe((e, {item}) => {
            dv.updateItem(item.id, item)
        })

        dv.onRowsChanged.subscribe((e, {rows}) => {
            grid.invalidateRows(rows);
            grid.render();
        });

        grid.init();

        window.addEventListener('resize', this.handleResize);

        this.mutate();
    }

    // cellUpdate(id, item, column){
    //   const idx = dv.getIdxById(id);
    //   if (idx === undefined || id !== item.id) {
    //     throw "Invalid or non-matching id";
    //   }
    //   dv.getItems()[idx] = item;
    //
    //   const columnsToUpdate = Array.from(column)
    //   const colIndex = columnsToUpdate.map(this.instance.getColumnIndex);
    //   const range = this.instance.getRenderedRange()
    //
    //   for (let row = range.top; row <= range.bottom; row++) {
    //     for (let col = 0; col < columns.length; col++) {
    //       this.instance.updateCell(row, col);
    //
    //     }
    //   }
    // }

    mutate = () => {
        const currency = _.sample(this.rates);
        const price = morphRate(currency);
        this.historic[currency].push(price);
        this.historic[currency].length > 15 && this.historic[currency].unshift()
        let hasUpdates = false
        dv.getItems().forEach(item => {
            if (this.state.editing && item.id === this.state.editing.id)
                return;

            if (item.currency === currency){
                item.direction = price > item.price ? 'up' : 'down';
                item.price = price;
                item.historic = this.historic[currency];

                if (!hasUpdates){
                    hasUpdates = true
                    dv.beginUpdate()
                }
                dv.updateItem(item.id, item);
            }
        })

        hasUpdates && dv.endUpdate()
        setTimeout(this.mutate, _.random(100, 1000))
    }

    componentWillUnmount(){
        this.gridInstance.destroy();
        window.removeEventListener('resize', this.handleResize);
    }

    render(){
        return <div className="" style={{height: this.props.containerHeight + 'px'}}>
            <div id='myGrid' className='slickgrid-container' ref={grid => this.grid = grid} />
        </div>
    }
}

export default Dimensions()(Home)

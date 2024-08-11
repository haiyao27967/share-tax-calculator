import "./App.css";
import { useState } from "react";

// utility
function roundUp(n) {
  return Number(n.toFixed(2));
}

// Function to convert a DD/MM/YYYY string to a Date object
function stringToDate(dateString) {
  // Split the date string into parts
  const [day, month, year] = dateString.split("/").map(Number);

  // Create and return the Date object
  // Subtract 1 from the month to convert to zero-based index
  return new Date(year, month - 1, day);
}

function dateToString(date) {
  const padToTwoDigits = (num) => num.toString().padStart(2, "0");
  return `${padToTwoDigits(date.getDate())}/${padToTwoDigits(
    date.getMonth() + 1
  )}/${date.getFullYear()}`;
}

function isWithin12Months(start, end) {
  // Create a new date object for the boundary date (12 months after 'start')
  const boundaryDate = new Date(start);
  boundaryDate.setMonth(start.getMonth() + 12);

  // Check if 'end' is between 'start' and 'boundaryDate'
  return end >= start && end <= boundaryDate;
}

function performCalculation(data) {
  // update remain
  data.forEach((element) => (element.remain = element.qty));

  for (let i = 0; i < data.length; i++) {
    const outerStock = data[i];

    if (outerStock.type === "Sell") {
      outerStock.cost = 0;
      outerStock.profit = 0;
      outerStock.taxableProfit = 0;

      for (let j = 0; j < data.length; j++) {
        const innerStock = data[j];

        // Check if the current stock is of type "Buy"
        if (
          outerStock.code === innerStock.code &&
          innerStock.type === "Buy" &&
          innerStock.remain > 0
        ) {
          var unitCost =
            innerStock.unitPrice +
            innerStock.brokerageWithGST / innerStock.qty +
            outerStock.brokerageWithGST / outerStock.qty;

          if (innerStock.remain >= outerStock.remain) {
            var cost = unitCost * outerStock.remain;
            var profit = outerStock.unitPrice * outerStock.remain - cost;
            outerStock.cost += cost;
            outerStock.profit += profit;
            // tax reduced for holding over half years
            outerStock.taxableProfit += isWithin12Months(
              innerStock.date,
              outerStock.date
            )
              ? profit
              : profit / 2;

            innerStock.remain -= outerStock.remain;
            outerStock.remain = 0;
            break;
          } else {
            var cost = unitCost * innerStock.remain;
            var profit = outerStock.unitPrice * innerStock.remain - cost;

            outerStock.cost += cost;
            outerStock.profit += profit;
            // tax reduced for holding over half years
            outerStock.taxableProfit += isWithin12Months(
              innerStock.date,
              outerStock.date
            )
              ? profit
              : profit / 2;
            outerStock.remain -= innerStock.remain;
            innerStock.remain = 0;
          }
        }
      }
    }
  }
  return data;
}

// components

function SubTable({ data }) {
  const header = [
    "Date",
    "Type",
    "Quantity",
    "Remain",
    "Unit Price ($)",
    "Trade Value ($)",
    "Brokerage+GST ($)",
    "Total Value ($)",
    "Cost",
    "Profit",
    "Adjust",
  ];

  return (
    <table class="table table-bordered">
      <thead class="table-dark">
        <tr>
          {header.map((x) => (
            <th>{x}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr class={row.type == "Buy" ? "table-success" : "table-danger"}>
            <td>{dateToString(row.date)}</td>
            <td>{row.type}</td>
            <td>{row.qty}</td>
            <td>{row.type === "Buy" ? row.remain : ""}</td>
            <td>{row.unitPrice}</td>
            <td>{roundUp(row.unitPrice * row.qty)}</td>
            <td>{row.brokerageWithGST}</td>
            <td>
              {row.type == "Sell"
                ? roundUp(row.qty * row.unitPrice - row.brokerageWithGST)
                : -1 * roundUp(row.qty * row.unitPrice + row.brokerageWithGST)}
            </td>
            <td>{row.type === "Sell" ? roundUp(row.cost) : ""}</td>
            <td>{row.type === "Sell" ? roundUp(row.profit) : ""}</td>
            <td>{row.type === "Sell" ? roundUp(row.taxableProfit) : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransactionTable({ data, handleDelete }) {
  const header = [
    "Code",
    "Date",
    "Type",
    "Quantity",
    "Unit Price ($)",
    "Trade Value ($)",
    "Brokerage+GST ($)",
    "Total Value ($)",
    "Profit",
    "Adjust",
    "Operations",
  ];

  const Totals = data.reduce(
    (accumulator, currentValue) => {
      if (currentValue.type === "Sell") {
        accumulator.netValue += roundUp(
          currentValue.qty * currentValue.unitPrice -
            currentValue.brokerageWithGST
        );
        accumulator.netProfit += currentValue.profit;
        accumulator.netTaxableProfit += currentValue.taxableProfit;
      } else {
        accumulator.netValue -= roundUp(
          currentValue.qty * currentValue.unitPrice +
            currentValue.brokerageWithGST
        );
      }
      return accumulator;
    },
    { netValue: 0, netProfit: 0, netTaxableProfit: 0 }
  );

  return (
    <table class="table table-bordered table-hover">
      <thead class="table-dark">
        <tr>
          {header.map((item) => (
            <th scope="col">{item}</th>
          ))}
        </tr>
      </thead>
      {data.length > 0 && (
        <tbody>
          {data.map((item, index) => (
            <tr class={item.type == "Buy" ? "table-success" : "table-danger"}>
              <td scope="col">{item.code}</td>
              <td scope="col">{dateToString(item.date)}</td>
              <td scope="col">{item.type}</td>
              <td scope="col">{item.qty}</td>
              <td scope="col">{item.unitPrice}</td>
              <td scope="col">{roundUp(item.qty * item.unitPrice)}</td>
              <td scope="col">{item.brokerageWithGST}</td>
              <td scope="col">
                {item.type == "Sell"
                  ? roundUp(item.qty * item.unitPrice - item.brokerageWithGST)
                  : -1 *
                    roundUp(item.qty * item.unitPrice + item.brokerageWithGST)}
              </td>
              <td scope="col">
                {item.type === "Sell" ? roundUp(item.profit) : ""}
              </td>
              <td scope="col">
                {item.type === "Sell" ? roundUp(item.taxableProfit) : ""}
              </td>

              <td scope="col">
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  onClick={() => handleDelete(index)}
                >
                  Detele
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      )}
      <tfoot>
        <tr>
          <td colspan="6"></td>
          <td>Totals:</td>
          <td>{Totals.netValue}</td>
          <td>{roundUp(Totals.netProfit)}</td>
          <td>{roundUp(Totals.netTaxableProfit)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  );
}

function AddTransactionSection({ addTransaction }) {
  const [selectedParser, setSelectedParser] = useState("commSec");
  const [text, setText] = useState("");
  const [code, setCode] = useState("");

  // convert a single line string into one transaction
  function stringToTransaction(text) {
    var data = text.split("\t");

    var transaction = {};
    transaction.code = data[0];
    transaction.date = stringToDate(data[2]);
    transaction.type = data[3];
    transaction.qty = parseInt(data[4]);
    transaction.unitPrice = parseFloat(data[5]);
    transaction.brokerageWithGST = parseFloat(data[7]);

    return transaction;
  }

  function stringToTransactionVariant(text) {
    var data = text.split("\t");

    var transaction = {};
    transaction.date = stringToDate(data[0]);
    transaction.type = data[1];
    transaction.qty = parseInt(data[2]);
    transaction.unitPrice = parseFloat(data[3]);
    transaction.brokerageWithGST = parseFloat(data[5]);
    return transaction;
  }

  const handleParserChange = (event) => {
    setSelectedParser(event.target.value);
  };

  function handleAdd() {
    // covert string to transaction
    const rows = text.trim().split("\n");

    if (selectedParser === "commSec") {
      addTransaction(rows.map((row) => stringToTransaction(row)));
    } else {
      if (code.length === 0) {
        window.alert("Please enter the company code!!!");
      } else {
        addTransaction(
          rows.map((row) => {
            var item = stringToTransactionVariant(row);
            item.code = code;
            return item;
          })
        );
      }
    }
  }

  return (
    <div class="container py-2">
      <div class="form-check pb-2">
        <input
          class="form-check-input"
          type="radio"
          name="parser"
          id="withoutCode"
          value="withoutCode"
          checked={selectedParser === "withoutCode"}
          onChange={handleParserChange}
        />
        <label class="form-check-label" for="withoutCode">
          format: Date/Type/Quantity/Unit Price ($)/Trade Value
          ($)/Brokerage+GST ($)/GST ($)/Contract Note/Total Value ($)
        </label>
      </div>
      <div class="form-check pb-2">
        <input
          class="form-check-input"
          type="radio"
          name="parser"
          id="commSec"
          value="commSec"
          checked={selectedParser === "commSec"}
          onChange={handleParserChange}
        />
        <label class="form-check-label" for="commSec">
          format(For commBank csv): Code/Company/Date/Type/Quantity/Unit Price
          ($)/Trade Value ($)/Brokerage+GST ($)/GST ($)/Contract Note/Total
          Value ($)
        </label>
      </div>
      {selectedParser === "withoutCode" && (
        <div class="input-group">
          <input
            type="text"
            class="form-control"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      )}
      <div class="input-group">
        <textarea
          class="form-control"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
        <button class="btn btn-primary" type="button" onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
}

function App() {
  const [tableData, setTableData] = useState([]);

  function handleDelete(indexToRemove) {
    setTableData(
      performCalculation(
        tableData.filter((_, index) => index !== indexToRemove)
      )
    );
  }

  function handleAdd(data) {
    setTableData(
      performCalculation(
        tableData.concat(data).toSorted((a, b) => a.date - b.date)
      )
    );
  }

  const groupedByCode = tableData.reduce(
    (accumulator, currentObject, index) => {
      const { code } = currentObject;

      // Check if there's already an array for this code
      if (!accumulator[code]) {
        accumulator[code] = [];
      }

      // Add the current object to the corresponding array
      accumulator[code].push({ ...currentObject, id: index });

      return accumulator;
    },
    {}
  );

  const arrayOfArrays = Object.values(groupedByCode);

  return (
    <div class="container shadow">
      <h4>Transactions</h4>
      <AddTransactionSection addTransaction={handleAdd} />
      <TransactionTable data={tableData} handleDelete={handleDelete} />
      {arrayOfArrays.map((item) => (
        <div class="container mb-4">
          <h5>{item[0].code}</h5>
          <SubTable data={item} />
        </div>
      ))}
    </div>
  );
}

export default App;

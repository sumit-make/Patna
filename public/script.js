// Handle Add Stock Form
document.getElementById("stockForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const stockData = Object.fromEntries(formData.entries());

  const res = await fetch("/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stockData)
  });

  if (res.ok) {
    alert("Stock Added Successfully!");
    e.target.reset();
  } else {
    alert("Error Adding Stock");
  }
});


// Fetch & Display Stocks
const stockTable = document.getElementById("stockTable");
if (stockTable) {
  async function loadStocks() {
    const res = await fetch("/stocks");
    const stocks = await res.json();
    const tbody = stockTable.querySelector("tbody");
    tbody.innerHTML = "";

    // stocks.forEach(stock => {
    //   const row = document.createElement("tr");
    //   row.innerHTML = `
    //     <td>${stock.item}</td>
    //     <td>${stock.category}</td>
    //     <td>${stock.quantity}</td>
    //     <td>${stock.price}</td>
    //     <td>
    //       <button onclick="deleteStock('${stock._id}')">Delete</button>
    //     </td>
    //   `;
    //   tbody.appendChild(row);
    // });

stocks.forEach(stock => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${stock.SerialNo || ""}</td>
    <td>${stock.PONo || ""}</td>
    <td>${stock.PODate || ""}</td>
    <td>${stock.Description || ""}</td>
    <td>${stock.Qty || ""}</td>
    <td>${stock.Cost || ""}</td>
    <td>${stock.BillNo || ""}</td>
    <td>${stock.Supplier || ""}</td>
    <td>${stock.ReceiptDate || ""}</td>
    <td>${stock.DeptLab || ""}</td>
    <td>${stock.Dept || ""}</td>
    <td>${stock.FoundOK || ""}</td>
    <td>${stock.Shortage || ""}</td>
    <td>${stock.Excess || ""}</td>
    <td>${stock.Location || ""}</td>
    <td>${stock.Remarks || ""}</td>
    <td><button onclick="deleteStock('${stock._id}')">Delete</button></td>
  `;
  tbody.appendChild(row);
});

  }

  loadStocks();

  window.deleteStock = async function(id) {
    await fetch(`/delete/${id}`, { method: "DELETE" });
    loadStocks();
  }
}

// Download CSV (simple)
async function downloadCSV() {
  const res = await fetch("/stocks");
  const stocks = await res.json();
  let csv = "SerialNo,PO No,PO Date,Description,Qty,Cost,Bill No,Supplier,Receipt Date,Dept/Lab,Dept,Found OK,Shortage,Excess,Location,Remarks\n";
stocks.forEach(s => {
  csv += `${s.SerialNo},${s.PONo},${s.PODate},${s.Description},${s.Qty},${s.Cost},${s.BillNo},${s.Supplier},${s.ReceiptDate},${s.DeptLab},${s.Dept},${s.FoundOK},${s.Shortage},${s.Excess},${s.Location},${s.Remarks}\n`;
});


  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stocks.csv";
  a.click();
}
document.getElementById("csvForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("csvFile", document.getElementById("csvFile").files[0]);

  const res = await fetch("/upload-csv", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  document.getElementById("csvMsg").innerText = data.message || data.error;
});

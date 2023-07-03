const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const app = express();
const databaseFilePath = './data.csv';


// Route to get the total number of items
app.get('/total_items', async (req, res) => {
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  const department = req.query.department;

  try {
    const result = await getTotalItems(startDate, endDate, department);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});


// Route to get the nth most total item
app.get('/nth_most_total_item', async (req, res) => {
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  const itemBy = req.query.item_by;
  const n = parseInt(req.query.n);

  try {
    const result = await getNthMostTotalItem(startDate, endDate, itemBy, n);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});


// Route to get the percentage of department-wise sold items
app.get('/percentage_of_department_wise_sold_items', async (req, res) => {
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;

  try {
    const result = await getPercentageOfDepartmentWiseSoldItems(startDate, endDate);
    res.json({ percentageOfDepartmentWiseSoldItems: result });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});


// Route to get monthly sales
app.get('/monthly_sales', async (req, res) => {
  const softwareName = req.query.software_name;
  const year = parseInt(req.query.year);

  try {
    const result = await getMonthlySales(softwareName, year);
    res.json({ monthlySales: result });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

//Function for TotalItems
async function getTotalItems(startDate, endDate, department) {
  const items = await loadDataFromCSV();
  let totalItems = 0;


  items.forEach((item) => {
    const temp = item.date.substr(0, 10);
    const itemDate = new Date(temp);
    if (
      itemDate >= new Date(startDate) &&
      itemDate <= new Date(endDate) &&
      item.department === department
    ) {
      totalItems++;
    }
  });

  return totalItems;
}


//Function for Nth_most_total_item
async function getNthMostTotalItem(startDate, endDate, itemBy, n) {
  const items = await loadDataFromCSV();
  let softwareSales = {};

  items.forEach((item) => {
    const itemDate = new Date(item.date);
    if (itemDate >= new Date(startDate) && itemDate <= new Date(endDate)) {
      if (softwareSales[item.software]) {
        if (itemBy === 'quantity') {
          softwareSales[item.software] += parseInt(item.seats);
        } else if (itemBy === 'price') {
          softwareSales[item.software] += parseInt(item.amount);
        }
      } else {
        if (itemBy === 'quantity') {
          softwareSales[item.software] = parseInt(item.seats);
        } else if (itemBy === 'price') {
          softwareSales[item.software] = parseInt(item.amount);
        }
      }
    }
  });

  const sortedItems = Object.entries(softwareSales).sort((a, b) => b[1] - a[1]);

  if (n <= 0 || n > sortedItems.length) {
    throw new Error('Invalid value of n');
  }
  return sortedItems[n - 1][0];
}


//Function for Percentage of Department Wise Items
async function getPercentageOfDepartmentWiseSoldItems(startDate, endDate) {
  const items = await loadDataFromCSV();
  const departmentSoldItems = {};

  items.forEach((item) => {
    const itemDate = new Date(item.date);
    if (itemDate >= new Date(startDate) && itemDate <= new Date(endDate)) {
      if (departmentSoldItems[item.department]) {
        if (departmentSoldItems[item.department][item.software]) {
          departmentSoldItems[item.department][item.software] += parseInt(item.seats);
        } else {
          departmentSoldItems[item.department][item.software] = parseInt(item.seats);
        }
      } else {
        departmentSoldItems[item.department] = { [item.software]: parseInt(item.seats) };
      }
    }
  });

  const percentageOfDepartmentWiseSoldItems = {};

  for (const department in departmentSoldItems) {
    const softwareItems = departmentSoldItems[department];
    const departmentData = {
      department,
      items: []
    };

    let totalItems = 0;

    for (const software in softwareItems) {
      totalItems += softwareItems[software];
    }

    for (const software in softwareItems) {
      const itemCount = softwareItems[software];
      const percentage = (itemCount / totalItems) * 100;

      departmentData.items.push({
        software,
        itemCount,
        percentage: percentage.toFixed(2)
      });
    }

    percentageOfDepartmentWiseSoldItems[department] = departmentData;
  }

  return percentageOfDepartmentWiseSoldItems;
}



//Function for Monthly sales of a given item
async function getMonthlySales(softwareName, year) {
  const items = await loadDataFromCSV();
  const monthlySales = {};

  items.forEach((item) => {
    const itemDate = new Date(item.date);
    const itemYear = itemDate.getFullYear();
    console.log(item.seats);

    if (item.software === softwareName && itemYear === year) {
      const key = itemDate.toLocaleString('default', { month: 'long' });

      if (monthlySales[key]) {
        monthlySales[key] += parseInt(item.seats);
      } else {
        monthlySales[key] = parseInt(item.seats);
      }
    }
  });

  return monthlySales;
}


async function loadDataFromCSV() {
  const items = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(databaseFilePath)
      .pipe(csv())
      .on('data', (data) => items.push(data))
      .on('end', () => resolve(items))
      .on('error', (error) => reject(error));
  });
}

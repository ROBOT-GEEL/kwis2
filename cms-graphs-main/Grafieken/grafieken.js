/*
 This file contains the functions to handle the pie charts and the time series. It uses the Chart.js library for the pie charts and the ApexCharts library for the time series.
  The pie charts are created by the addPieChart function and the time series is created by the addTimeline function.
  Those functions are called from the fetchResults and fetchTimeResultsfunction in the script.js file.
*/

// colours to use in the pie charts
const barColors = [
    "#5b9bd5", // blue
    "#70ad47", // green
    "#ffc000" // yellow
];

let timechart;

window.addEventListener('load', function () {
  })

// function to add a pie chart to the page, this function is called from the fetchResults function (onLoad) in the script.js file
// name: the name of the pie chart
// xValues: the labels for the pie chart
// yValues: the values for the pie chart
// title: the title of the pie chart
// total: the total number of answers
// showLegend: boolean to show the legend or not
function addPieChart(name, xValues, yValues, title, total, showLegend) {

  // create a div element to hold the pie chart and its legend
  let div = document.createElement('div');
  div.className = 'divpieChart';

  // every pie chart gets its own canvas element and contains the chart itself
  // the canvas has the id of the question
  let canv = document.createElement('canvas');
  canv.id = name;
  canv.className = 'pieChart';

  div.appendChild(canv);
  document.getElementById('divGrafieken').appendChild(div); // adds the canvas to div
    
  // define graph options
  pieChart = new Chart(canv, {
    type: "pie",
    data: {
      labels: xValues,
      datasets: [{
        backgroundColor: barColors,
        data: yValues,
      }]
    },
    options: {
      plugins: {
        labels: {
          fontColor: '#FFFFFF',
        }
      }, 
      legend: {
        display: false,
        position: 'right',
        align: 'left'
      },
      title: {
        display: true,
        text: title,
        align: 'middle'
      },
      maintainAspectRatio: false
    },    
  });


  // the legend conatiains the number of answers and a button to show the time series
  if(showLegend){
    let legend = document.createElement('div');
    legend.className = 'legend';
    legend.innerHTML =  pieChart.generateLegend();

    // Add colors to the legend
    let ul = legend.querySelector('ul');
    let liElements = ul.querySelectorAll('li');
    for (let i = 0; i < liElements.length; i++) {
      let coloredSpan = document.createElement('span');
      coloredSpan.style.display = 'inline-block';
      coloredSpan.style.width = '40px';
      coloredSpan.style.height = '20px';
      coloredSpan.style.marginRight = '5px';
      coloredSpan.style.backgroundColor = barColors[i];
      liElements[i].insertBefore(coloredSpan, liElements[i].firstChild);
      liElements[i].style.listStyleType = 'none'; // Remove the dot before the item
    }

        
    // Add extra list element to display the total number of answers
    let li = document.createElement('li');
    li.textContent = "Aantal antwoorden: " + total;
    li.style.listStyleType = 'none'; // Remove the dot before the item
    ul.appendChild(li);

    // Add button to open time series
    let button = document.createElement('button');
    button.textContent = "Toon tijdreeks";
    button.onclick = function() {
      // call the function to show the time series when the button is clicked
      showTimeSeries(name); 
    }
    ul.appendChild(button);

        div.appendChild(legend);
  }
}

// function to show the time series, this function is called when the button in the legend is clicked
// name: the name of the pie chart (= the id of the question)
function showTimeSeries(name){
  console.log("Show time series for " + name);

  // enable the overlay and the modal
  overlay = document.getElementById("grapgoverlay");
  overlay.style.display = "block";
  modal = document.getElementById("graphmodal");
  modal.style.display = "block";

  // fetch the time series data for a given question id
  fetchTimeResults(name);

  // close the modal when the overlay is clicked
  overlay.addEventListener('click', function(e) {
    modal.style.display = "none";
    timechart.destroy();
    overlay.style.display = "none";
  });
}

// this function is called if the fetch in the showTimeSeries function is successful
// adds the time series graph to the modal
function addTimeline(data){
  timeline = document.createElement('div');
  timeline.id = 'divtimeline';
  document.getElementById('graphmodal').appendChild(timeline);
   
  // graph options
  let options = {
    // data for the 3 separate lines in the time series (zone A, B and C)
    series: [
      {
        name: data.info.nl.answers[0],
        data: data.results.A
      },
      {
        name: data.info.nl.answers[1],
        data: data.results.B
      },
      {
        name: data.info.nl.answers[2],
        data: data.results.C
      }
    ],
    chart: {
      type: 'area',
      stacked: false,
      width: '100%',
      height: '100%',
      zoom: {
        type: 'x',
        enabled: true,
        autoScaleYaxis: true
      },
      toolbar: {
        autoSelected: 'zoom',
        show: true,
        tools: {
          download: true,
        },
        export: {
          csv: {
            filename: data.info.nl.question, 
          },
          png: {
            filename: data.info.nl.question, 
          },
          svg: {
            filename: data.info.nl.question, 
          },  
        },
      },
    },
    dataLabels: {
      enabled: false
    },
    markers: {
      size: 5,
    },
    title: {
      text: data.info.nl.question,
      align: 'left'
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 90, 100]
      },
    },
    yaxis: {
      labels: {
        formatter: function (val) {
          return val;
        },
      },
      title: {
        text: 'Aantal antwoorden'
      },
    },
    xaxis: {
      type: 'datetime',
      tooltip: {
        enabled: false
      }
    },
    tooltip: {
      shared: true,
      y: {
        formatter: function (val) {
          return val;
        }
      }
    },
    export: {
      // csv configuration
      csv: {
        columnDelimiter: ',',
        headerCategory: 'category',
        headerValue: 'value',
        dateFormatter(timestamp) {
          return new Date(timestamp).toDateString()
        }
      }
    }
  };

  // create the new chart with the given options
  timechart = new ApexCharts(timeline, options);
  timechart.render();
}
  
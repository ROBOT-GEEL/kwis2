/*
 This file contains the functions to the requests to the backend. Requests are made to get the quiz results and the time series data.
  The fetchResults function is called from the window.onload event in the script.js file. This generates the pie charts.
  The fetch functions are called from the grafieken.js file.
  After a successful fetch, the addGraphs/addTimeline function from grafieken.js is called to add charts.
*/

// function to fetch the quiz results from the backend (pie charts)
// config: the configuration object for the fetch request filter (bezocht, enable)
// the result is an array of objects. Each object contains the information for a single question
async function fetchResults(config) {
    const response = await fetch("/grafieken/get-results", {
      method: "POST",
      body: JSON.stringify({
        userId: 1,
        title: "Quiz results",
        config: config,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });
  
    if (response.status !== 200) {
      throw new Error(`Error getting quiz results: ${response.status}`);
    }
  
    const data = await response.json();

    console.log("Quiz results fetch done: ", data);

    // if no data is found, display a message, otherwise add the pie charts
    if(data.length > 0){
      data.forEach(addGraphs);
    }else{
      document.getElementById("infoDiv").innerHTML += "<h4 style='color:red;'>Geen resultaten gevonden</h4>";
    }
    
  }

  function addGraphs(value) {
    // calculate the total number of answers
    let totalAnswers = value.sumResults.reduce((a, b) => a + b, 0);
    // scale the results to percentages
    let scaledResults = value.sumResults.map(function(item) { return ((item/totalAnswers)*100).toFixed(1)} )

    // every pie chart has a title (=question) and the possible answers
    // if a question has the dutch info (title, possible answers), use it, otherwise use "Onbekend" and ["A", "B", "C"] as possible answers
    // addPieChart is a function from grafieken.js
    if(value.nl !== undefined){
      addPieChart(String(value._id), value.nl.answers, scaledResults, value.nl.question, totalAnswers, true);
    }else{
      addPieChart(String(value._id), ["A", "B", "C"], value.sumResults, "Onbekend", totalAnswers, true);
    }
  }
  
  // call the fetchResults function when the window is loaded so the pie charts are generated
  // before the function is called, the url parameters are checked to see if the filters are enabled
  // 2 parameters are checked: bezocht (true/false) and enable (true/false)
  // if a parameter is undefined, both true and false values are displayed
  // eg. bezocht=true: only display the questions for the returning visitors
  window.addEventListener('load', function () {
    //format: ?bezocht=x&enable=x
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    
    // get the parameters and convert to boolean, null if not defined
    const bezocht = JSON.parse(urlParams.get('bezocht'))
    const enable = JSON.parse(urlParams.get('enable'))
    console.log("Parameters: bezocht:", bezocht, "enable:", enable);

    // the filter data is displayed in the infoDiv eg. "Filter: toon actieve vragen voor reeds bezocht"
    // this part od code is used to genarate the correct text based on the url parameters
    const enableString = enable === true ? "actieve" : enable === false ? "gearchiveerde" : "";
    const bezochtString = bezocht === true ? "reeds bezocht" : bezocht === false ? "nieuwe bezoekers" : "";
    const infodiv = document.getElementById("infoDiv");
    if(enable !== null && bezocht !== null){
      infodiv.innerHTML += "<h4>Filter: toon " + enableString + " vragen voor " + bezochtString + "</h4>";
    }else if(enable !== null){
      infodiv.innerHTML += "<h4>Filter: toon enkel " + enableString +" vragen</h4>";
    }else if(bezocht !== null){
      infodiv.innerHTML += "<h4>Filter: toon vragen voor " + bezochtString + "</h4>";
    }else if(bezocht === null && enable === null){
      infodiv.innerHTML += "<h4>Filter: toon alle vragen</h4>";
    }
    
    // fetch data and give the filter parameters so they can be used in pipeline filter in the backend
    fetchResults({"bezocht": bezocht, "enable": enable});

  })

  // function to fetch the quiz results from the backend (time charts)
  // id: the question id
  // the result is the time series data for a single question
  async function fetchTimeResults(id) {
    
    const response = await fetch("/grafieken/get-timeseries", {
      method: "POST",
      body: JSON.stringify({
        userId: 1,
        title: "Quiz time results",
        questionId: id}),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });
  
    if (response.status !== 200) {
      throw new Error(`Error getting quiz results: ${response.status}`);
    }
  
    const data = await response.json();

    console.log("Quiz time fetch done: ", data);

    addTimeline(data); // add the time series data to the timeline (function from grafieken.js)
  }

  

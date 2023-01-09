function include(file) {
    var script = document.createElement('script');
    script.src = file;
    script.type = 'text/javascript';
    script.defer = true;
      
    document.getElementsByTagName('head').item(0).appendChild(script);
}

var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
  
    return function( obj, callback ){
      if( !obj || obj.nodeType !== 1 ) return; 
  
      if( MutationObserver ){
        // define a new observer
        var mutationObserver = new MutationObserver(callback)
  
        // have the observer observe for changes in children
        mutationObserver.observe( obj, { childList:true, subtree:true })
        return mutationObserver
      }
      
      // browser support fallback
      else if( window.addEventListener ){
        obj.addEventListener('DOMNodeInserted', callback, false)
        obj.addEventListener('DOMNodeRemoved', callback, false)
      }
    }
})();

mainContentElement = document.querySelector('div#maincontent');
mainRuns = 0;

observeDOM( mainContentElement, function(m){ 
    var addedNodes = [], removedNodes = [];
 
    m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes));
    
    m.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes));
 
    if (document.querySelectorAll('div.dx-datagrid-headers.dx-datagrid-nowrap').length==2 && document.querySelectorAll('div.dx-datagrid-content.dx-datagrid-scroll-container').length==3) {
        if (mainRuns == 0) {
            console.log("======================================");
            console.log('Added:', addedNodes, 'Removed:', removedNodes);
            console.log('injecting super studentvue content.js');
            mainRuns += 1;
            mainRunScript();
        }
    } else {
        mainRuns = 0;
    }
 });

var table;
var tableBody;
var originalAssignmentsDataExactText;
var originalAssignmentsDataEffectiveNumbers;
var calculateGradesRunCounter;

function mainRunScript() {
    topSpaceDiv = document.querySelectorAll('div.detail-content')[0];
    appendButton(topSpaceDiv, insertRowFunc, "Create New Assignment");
    topSpaceDiv.appendChild(document.createElement("br"));
    appendButton(topSpaceDiv, resetToOriginalDataExactText, "Reset to Original Data");
    topSpaceDiv.appendChild(document.createElement("br"));

    changeStatusElem = document.createElement("p");
    changeStatusElem.id = "changeStatusElem";
    changeStatusElem.innerHTML = "change status: ";
    topSpaceDiv.appendChild(changeStatusElem);

    // make the table sorting thing unclickable
    // because if you sort the table then it will mess up the rows
    header = document.querySelectorAll('div.dx-datagrid-headers.dx-datagrid-nowrap')[1];
    header.style.cssText += 'pointer-events: none;';

    table = document.querySelectorAll('table.dx-datagrid-table.dx-datagrid-table-fixed')[3];
    tableBody = table.getElementsByTagName("tbody")[0];
    console.log(tableBody);

    if (checkIfFormattedAlready() == false) {
        formatTable();
    }
    
    originalAssignmentsDataExactText = [];
    originalAssignmentsDataEffectiveNumbers = [];
    calculateGradesRunCounter = 0;
    
    calculateGrades();
}


//================================================================================



function create(htmlStr) {
    var frag = document.createDocumentFragment(),
        temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
    }
    return frag;
}

function appendButton(elem, func, text){
	var buttonEl = document.createElement("a");
	buttonEl.onclick = func;
	var buttonTextEl = document.createElement("span");
	buttonTextEl.className = "button";
	buttonTextEl.innerText = text;
	buttonEl.appendChild(buttonTextEl);
	elem.appendChild(buttonEl);
}

function compareArrays(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
};

function parseGrade(num,val) {
    /*
    num = Math.round((num + Number.EPSILON) * 10**val) / 10**val;
    str = num.toString();
    console.log("str " + str);
    str = str.slice(0, (str.indexOf(".")) + val + 1); 
    console.log((str.indexOf(".")) + val + 1);
    console.log("str 2 " + str);
    return str;
    */
   return num.toFixed(val);
}

function getTRs() {
    //all_trs = $$('tr.dx-row.dx-data-row');
    all_trs_temp = tableBody.getElementsByTagName("tr");
    all_trs_temp = Array.from(all_trs_temp);
    all_trs = [];
    all_trs_temp.forEach( function(v,i,a) {
        if (v.matches('.dx-row.dx-data-row, .new-assignment')) {
            all_trs.push(v);
        }
    });
    console.log(all_trs);
    return all_trs;
}

function formatTable(data = []) {
    console.log(compareArrays(data, []));
    all_trs = getTRs();
    for (row=0; row<all_trs.length; row++) {
        tds = all_trs[row].getElementsByTagName("td");
        for (col=0; col<tds.length; col++) {
            if (tds[col].getAttribute("aria-describedby")==="dx-col-13") {
                if (compareArrays(data, []) == true) {
                    categoryText = tds[col].innerHTML;
                } else {
                    categoryText = data[row][0];
                }
                tds[col].innerHTML = "";
                tds[col].appendChild(createCategDropdown(categoryText));
            }
            if (tds[col].getAttribute("aria-describedby")==="dx-col-17") {
                if (compareArrays(data, []) == true) {
                    pointsText = tds[col].innerHTML;
                } else {
                    pointsText = data[row][1];
                }
                tds[col].innerHTML = "";
                tds[col].appendChild(createScoreInput(pointsText));
            }
        }
    }
}

function checkIfFormattedAlready() {
    all_trs = getTRs();
    for (row=0; row<all_trs.length; row++) {
        tds = all_trs[row].getElementsByTagName("td");
        for (col=0; col<tds.length; col++) {
            if (tds[col].getAttribute("aria-describedby")==="dx-col-13") {
                if (tds[col].getElementsByTagName('select').length != 0) {
                    return true;
                }
            }
            if (tds[col].getAttribute("aria-describedby")==="dx-col-17") {
                if (tds[col].getElementsByTagName('input').length != 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function createScoreDictFromAssignmentsData(assignmentsData) {
    dictScores = {};
    for (i=0; i<assignmentsData.length; i++) {
        var category = assignmentsData[i][0];
        if (!(category in dictScores)) {
            dictScores[category] = {"received":0, "possible":0};
        }
        var pointsReceived = assignmentsData[i][1][0];
        var pointsPossible = assignmentsData[i][1][1];
        dictScores[category]["received"] += pointsReceived;
        dictScores[category]["possible"] += pointsPossible;
    }
    console.log(dictScores);
    return dictScores;
}

function calculateGrades() {
    calculateGradesRunCounter += 1;

    all_trs = getTRs();
    assignmentsData = []; // effective numbers
    assignmentsDataExactText = [];
    for (row=0; row<all_trs.length; row++) {
        assignmentsData.push([]);
        assignmentsDataExactText.push([]);
        tds = all_trs[row].getElementsByTagName("td");
        console.log(tds);
        /*
        if (tds[8].getElementsByTagName('span')[0].innerText !== "(Not For Grading)") {
            continue;
        }
        */
        for (col=0; col<tds.length; col++) {
            if (tds[col].matches(".typeCell, [aria-describedby='dx-col-13']")) {
                e = tds[col].getElementsByTagName('select')[0];
                categoryText = e.options[e.selectedIndex].text;
                assignmentsData[row].push(categoryText);
                assignmentsDataExactText[row].push(categoryText);
            }
            if (tds[col].matches(".scoreCell, [aria-describedby='dx-col-17']")) {
                pointsText = tds[col].getElementsByTagName('input')[0].value;
                console.log(tds[col]);
                scoreSplit = pointsText.split('/').map(Number);
                if (scoreSplit.length == 2) {
                    assignmentsData[row].push(scoreSplit);
                } else {
                    assignmentsData[row].push([0,0]);
                }
                assignmentsDataExactText[row].push(pointsText);
            }
        }
    }

    // for the effective numerical data, take out all empty (0/0) assignments
    assignmentsData = assignmentsData.filter(function(value, index, arr){ 
        return !compareArrays(value[1], [0,0]);
    });


    if (calculateGradesRunCounter == 1) {
        originalAssignmentsDataEffectiveNumbers = JSON.parse(JSON.stringify(assignmentsData));
        originalAssignmentsDataExactText = JSON.parse(JSON.stringify(assignmentsDataExactText));
    }

    //newAssignments.forEach(function(v){assignmentsData.push(v)});
    console.log(assignmentsData);
    
    dictScores = createScoreDictFromAssignmentsData(assignmentsData);
    
    grade = dictScores['All Tasks / Assessments']['received']/dictScores['All Tasks / Assessments']['possible']*0.9 + dictScores['Practice / Preparation']['received']/dictScores['Practice / Preparation']['possible']*0.1;
    grade *= 100;
    console.log(grade);
    document.querySelector('div.score').innerHTML = parseGrade(grade, 4)+"%";

    letterGrade = "";
    if (89.45 <= grade) {letterGrade = "A";}
    else if (79.45 <= grade) {letterGrade = "B";}
    else if (69.45 <= grade) {letterGrade = "C";}
    else if (59.45 <= grade) {letterGrade = "D";}
    else {letterGrade = "E";}
    document.querySelector('div.mark').innerHTML = letterGrade;

    if (compareArrays(assignmentsDataExactText, originalAssignmentsDataExactText) == true) {
        document.getElementById('changeStatusElem').innerHTML = "change status: assignments data is exactly equal to original";
    }
    else if (compareArrays(assignmentsData, originalAssignmentsDataEffectiveNumbers) == true) {
        document.getElementById('changeStatusElem').innerHTML = "change status: assignments data is numerically equal to original";
    } else {
        document.getElementById('changeStatusElem').innerHTML = "change status: assignments data is different than the original";
    }
}

function resetToOriginalDataExactText() {
    // remove all new assignment rows /////
    all_trs = getTRs();
    trsToRemove = [];
    for (row=0; row<all_trs.length; row++) {
        e = all_trs[row];
        if (e.matches('.new-assignment')) {
            e.remove();
        }
    }

    // formatTable using data exact text /////
    formatTable(originalAssignmentsDataExactText);

    // recalculate grades /////
    calculateGrades();
}

function createCategDropdown(categoryText = "") {
    categDropdown = document.createElement('select');
	
    type1 = document.createElement('option');
    type1.innerHTML = "Practice / Preparation";
    type2 = document.createElement('option');
    type2.innerHTML = "All Tasks / Assessments";
	
	if (categoryText === "Practice / Preparation") {
		type1.selected = true;
	} else {
		type2.selected = true;
	}
	
    categDropdown.appendChild(type1);
    categDropdown.appendChild(type2);
	
    categDropdown.onchange = calculateGrades;
	
	return categDropdown;
}

function createScoreInput(pointsText = "") {
    scoreInput = document.createElement("input");
	
	scoreInput.value = pointsText;
    scoreInput.oninput = calculateGrades;

	return scoreInput;
}

function insertRowFunc(categoryText = "", pointsText = "") {
    row = tableBody.insertRow(0);
    row.className = "new-assignment dx-row dx-data-row dx-column-lines";
    row.insertCell();
    row.insertCell();
    row.insertCell();
    
    typeCell = row.insertCell();
    typeCell.className = "typeCell";
    typeCell.appendChild(createCategDropdown(categoryText));
    
    row.insertCell();
    row.insertCell();
    row.insertCell();

    scoreCell = row.insertCell();
    scoreCell.className = "scoreCell";
    scoreCell.appendChild(createScoreInput(pointsText));
}

// i think so XX   record original assignments data (effective/numerical)
// i think so XX   record original assignments data (exact text)

// XX   add reset button to revert back to original assignments data (exact text)

// xx    check if current table data == original assignments data (effective/numerical)
// xx    add an indicator for that


// X    TODO change letter grade

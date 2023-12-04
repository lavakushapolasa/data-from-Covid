const express = require("express");
const app = express();
app.use(express.json());
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log("DB Error: ${e.message}");
    process.exit(1);
  }
};

initializeDbAndServer();

const convertStateDbToResponseDb = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbToResponseDb = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//API 1 Returns a list of all states in the state table
app.get("/states/", async (request, response) => {
  const getStateList = `
    SELECT * FROM state;
    `;
  const stateArray = await db.all(getStateList);
  //  console.log(stateArray);
  response.send(
    stateArray.map((eachState) => convertStateDbToResponseDb(eachState))
  );
});

//API 2 Returns a state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state
    WHERE state_id = ${stateId};
    `;
  const state = await db.get(getStateQuery);
  response.send(convertStateDbToResponseDb(state));
});

//API 3 Create a district in the district table, district_id is auto-incremented

app.post("/districts/", async (request, response) => {
  const districtsDetail = request.body;
  //console.log(districtsDetail);
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtsDetail;
  const addDistrictQuery = `
  INSERT INTO 
  district (district_name,state_id,cases,cured,active,deaths)
  VALUES (
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}')`;
  const dbResponse = await db.run(addDistrictQuery);
  //console.log(dbResponse);
  const newDistrictDetails = dbResponse.lastID;
  response.send("District Successfully Added");
});

//API 4 Returns a district based on the district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM district 
    WHERE district_id =  ${districtId};
    `;
  const district = await db.get(getDistrictQuery);
  //console.log(district);
  response.send(convertDistrictDbToResponseDb(district));
});

//API 5 Deletes a district from the district table based on the district ID

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
    DELETE FROM district
    WHERE 
    district_id = ${districtId};
    `;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

//API 6 Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  console.log(districtDetails);
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updatedDistrictQuery = `
  UPDATE district 
  SET 
  district_name = '${districtName}',
  state_id = '${stateId}',
  cases = ${cases},
  cured = ${cured},
  active = ${active},
  deaths = ${deaths};
  `;
  await db.run(updatedDistrictQuery);
  response.send("District Details Updated");
});

//API 7 Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT 
    SUM(cases) as totalCases,
    SUM(cured) as totalCured,
    SUM(active) as totalActve,
    SUM(deaths) as totalDeats
    FROM 
    district
    WHERE 
    state_id = ${stateId};
    `;
  const stats = await db.get(getStateStatsQuery);
  response.send(stats);
  //console.log(stats);
});

//API 8 Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateQuery = `
    SELECT state_name AS stateName
    FROM district
    INNER JOIN state ON state.state_id = district.state_id
    WHERE district_id = ${districtId};`;
  const stateQuery = await db.get(getStateQuery);
  response.send(stateQuery);
});

module.exports = app;

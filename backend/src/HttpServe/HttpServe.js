const http = require("http");

const config = require("./HttpServeConfiguration")
const HttpServeData = require("./HttpServeData");
const HttpServeProgram = require("./HttpServeProgram");
const Router = require("./FileRouter");

/**
 * @typedef {Object} PriorityProgram
 * @property {Number} priority
 * @property {HttpServeProgram} program
 */

/**
 *
 */
class HttpServe {

    /** @type {Array<PriorityProgram>}*/
    programList;

    /**
     *
     * @param {string} frontendPath
     */
    constructor(frontendPath= "/") {
        this.programList = [];
        if(frontendPath){
            config.configuration.mainPath = frontendPath;
        }
    }

    /**
     * Adds program to HttpServe.
     * @param {HttpServeProgram} program
     * @param {Number} priority - higher number means earlier execution
     */
    addProgram(program, priority = 0){
        if(program === undefined || program === null)
            return;

        for(let i = 0 ; i < this.programList.length ; i++){
            if(this.programList[i].priority < priority){
                this.programList.splice(i, 0, {priority: priority, program: program});
                return;
            }
        }
        this.programList.push({priority: priority, program: program})
    }

    /**
     * Removes program from HttpServe.
     * @param {HttpServeProgram} program
     */
    removeProgram(program) {
        for(let i = 0 ; i < this.programList.length ; i++){
            if(this.programList[i].program === program){
                this.programList.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @param {module:http.IncomingMessage} req
     * @param {module:http.ServerResponse} res
     */
    handleRequest(req, res){
        console.log("New request:", req.method, req.url);
        let data = new HttpServeData();
        for(let i = 0 ; i < this.programList.length ; i++){

            let program = this.programList[i].program;
            program.handleRequest(req, res, data);

            console.log("  handled request", i, "|", data.done);

            if(data.done === true){ // break chain-responsibility
                break;
            }
        }

        if(!data.done){
            res.writeHead(400);
            res.end("Bad Request");
        }
        console.log("");
    }

    /**
     * @param {module:http.IncomingMessage} req
     * @param {module:http.ServerResponse} res
     */
    processHttpRequest(req, res){

        let program = this;

        let body = [];
        //req.setEncoding("utf-8")

        // store body before passing to programs
        req.on("data", (chunk)=>{
            body.push(chunk);
        });

        req.on("end", ()=>{
            console.log(req.headers["content-type"]);
            console.log(typeof body);
            console.log(body);

            // set body to request
            Object.defineProperty(req, "body", {
                value: Buffer.concat(body).toString('utf-8'),
                writable: true
            });

            program.handleRequest(req, res);
        });

        req.on("error", ()=>{
            console.log("[HttpServe]", "http request error");
        });

    }

    /**
     * Starts server
     * @param {Number} port
     */
    listen(port){
        let server = http.createServer(this.processHttpRequest.bind(this));
        server.listen(port);
    }


    testPrint(){
        for(let i = 0 ; i < this.programList.length ; i++){
            console.log(this.programList[i].priority, this.programList[i].program)
        }
    }

}

module.exports = HttpServe;
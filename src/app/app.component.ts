import {Component, Injectable, AfterViewInit} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/toPromise';
import * as Chart from 'chart.js';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']

})

@Injectable()
export class AppComponent {


    // *********** START Parameters **************
    url: string = 'http://localhost:3000/page_views'; //Backend endpoint
    //JSON body used for testing
    bodysav: string = '{\"urls\": [\"http://www.news.com.au/travel/travel-updates/incidents/disruptive-passenger-grounds-flight-after-storming-cockpit/news-story/5949c1e9542df41fb89e6cdcdc16b615\", \"http://www.smh.com.au/sport/tennis/an-open-letter-from-martina-navratilova-to-margaret-court-arena-20170601-gwhuyx.html\" ],\"before\": \"1496275200000\",\"after\" : \"1496361600000\", \"interval\" : \"60m\" }';


    // *********** ENDParameters **************



    rForm: FormGroup;
    links: string = '';
    linksArray: string[] = null;
    interval: number = null;
    before: number = null;
    after: number = null;
    bodyES: string = '{\"urls\": [ {urls}],\"before\": \"{before}\",\"after\" : \"{after}\", \"interval\" : \"{interval}\" }';
    dataGraph: string[] = null;
    arrayDateCharte: string[] = [];
    //Graph
    canvas: any;
    ctx: any;


    constructor(private fb: FormBuilder, private http: Http) {

        this.rForm = fb.group({
            'urls': [null, Validators.required],
            'interval': [null, Validators.required],
            'before': [null, Validators.required],
            'after': [null, Validators.required],
        });

    }

    displayGraph(post) {


        this.registerData(post);
        this.builDataEs(); //build the request we will send to the endpoint


        this.getEsData() //Send the request to the endpoint
            .then((result) => {

                this.builGraphData(result); //Build data for the graph with the results from the previous request
                this.builGraph(result); //Display the graph
            });
    }



    /*
    Build Graph data
     */
    builGraphData(result)
    {
        let graphData = [];

        for (let i = 0; i < this.linksArray.length; i++) //Every links
        {
            graphData[i] = [];
            for (let y = 0; y < result.aggregations.urls_filter.buckets[i].tps.buckets.length; y++) // Every result in the bucket
                graphData[i][y] = result.aggregations.urls_filter.buckets[i].tps.buckets[y].doc_count;
        }

        this.dataGraph = graphData;
    }

    /*
    Display the graph
     */

    builGraph(result)
    {

        this.canvas = document.getElementById('myChart');
        this.ctx = this.canvas.getContext('2d');


        let barChartData = {
            labels: this.intervalToArray(result.aggregations.urls_filter.buckets[0].tps.buckets.length),
            datasets: null

        };


        let myChart = new Chart(this.ctx, {
            type: 'bar',
            data: barChartData,
            options: {
                title: {
                    display: true,
                    text: 'Different events by urls'
                },
                tooltips: {
                    mode: 'index',
                    intersect: false
                },
                responsive: false,
                display: true,
                scales: {
                    xAxes: [{
                        stacked: true,
                    }],
                    yAxes: [{
                        stacked: true
                    }]
                }
            }
        });


        let palette = [
            'rgb(255, 159, 64)',
            'rgb(255, 205, 86)',
            'rgb(0, 163, 51)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)',
            'rgb(201, 203, 207)',
            'rgb(0,0,255)'
        ]

        for (let i = 0; i < this.linksArray.length; i++) {
            myChart.data.datasets.push({
                label: this.linksArray[i],
                backgroundColor: palette[i],
                data: this.dataGraph[i]
            });
            myChart.update();
        }
    }


    registerData(post)
    {
        this.links = post.urls.replace(' ', '');
        this.links = this.links.replace(/(\r\n\t|\n|\r\t)/gm, '');
        console.log(this.links);
        this.linksArray = this.links.split(',');
        this.interval = post.interval;
        this.before = post.before;
        this.after = post.after;
    }

    //Build the body of the request we will send to the API
    builDataEs()
    {
        //Deal with multiple urls
        let urlsBody = "";
        for (let i = 0; i < this.linksArray.length; i++) {
            urlsBody += "\"" + this.linksArray[i] + "\",";
        }

        //We remove the last comma
        urlsBody = urlsBody.slice(0, -1);

        //Replace the {} with the final values
        this.bodyES = this.bodyES.replace("{urls}", urlsBody);
        this.bodyES = this.bodyES.replace("{before}", this.before.toString());
        this.bodyES = this.bodyES.replace("{after}", this.after.toString());
        this.bodyES = this.bodyES.replace("{interval}",this.interval.toString()+ "m");

    }


    //Send the request to the API and have the answer from elastic search in back
    getEsData(): Promise<any> {

        let cpHeaders = new Headers({'Content-Type': 'application/json'});
        let options = new RequestOptions({headers: cpHeaders});
        console.log(this.bodyES);
        return this.http
            .post(this.url, JSON.parse(this.bodyES), options)
            .toPromise()
            .then(this.extractData)
            .catch(this.handleError);
    }



    /*Manual calculation on the interval, based on the start date and the interval given by the user
    Return an array of date string comprensible by human that will be display on the Graph.
     */
    private intervalToArray(size)
    {
        let intDate = new Date(parseInt(this.before.toString(), 10));
        let stringDate = intDate.toLocaleString();
        this.arrayDateCharte[0] = stringDate;
        for (let i = 1; i < size; i++) {
            let newTimestamp = parseInt(this.before.toString(), 10) + (parseInt(this.interval.toString(), 10) * 60000 * i);
            let date = new Date(parseInt((newTimestamp.toString()), 10));
            this.arrayDateCharte[i] = date.toLocaleString();
        }
        return this.arrayDateCharte;

    }


    private extractData(res: Response) {
        let body = res.json();
        return body || {};
    }
    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error);
        return Promise.reject(error.message || error);
    }
}

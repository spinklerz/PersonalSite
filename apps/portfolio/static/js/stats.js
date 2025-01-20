"use strict";

let app = {
    data() {
        return {
            checklistData: [],  // Will hold the checklist data for markers
            speciesList: [],    // Raw list of species
            sortedSpeciesList: [], // Alphabetically sorted list of species
            selectedSpecies: "", // Currently selected species
            map: null,          // Google Maps object
            markers: [],        // Markers displayed on the map
            totalSightings: 0,  // Total number of sightings for the selected species

            // For Chart.js data
            trendDates: [],     // Dates for the chart
            trendCounts: []     // Counts for the chart
        };
    },
    methods: {
      // Initialize the Google Map
        async initMap() {
            try {
              // Load the Google Maps JavaScript API
                const { Map } = await google.maps.importLibrary("maps");

                // Create a new map object
                this.map = new Map(document.getElementById("map"), {
                    center: { lat: 37, lng: -100.10 },
                    zoom: 4,
                });
            } catch (error) {
                console.error("Error initializing Google Map:", error);
            }
        },
        load_data() {
            axios.get(load_checklist_data_url).then((response) => {
                this.checklistData = response.data.checklist_data;
                this.speciesList = response.data.species_data;
                this.totalSightings = response.data.sightings_count;
                // Sort species list alphabetically
                this.sortedSpeciesList = [...this.speciesList].sort();

                // Prepare data for the trend chart
                this.trendDates = response.data.dates;
                this.trendCounts = response.data.counts;

                // Initialize the trend chart
                this.createTrendChart();

                this.initMap();
            }).catch((error) => {
                console.error("Error loading checklist data:", error);
            });
        },
        createTrendChart() {
          axios
              .get(bird_trends_url)
              .then((response) => {
                  // Extract data from the response
                  console.log("Trend data:", response.data);
                  const dates = response.data.dates; // Declare variables with const
                  const counts = response.data.counts;
      
                  // Get the canvas context for the chart
                  const ctx = document.getElementById('trendChart').getContext('2d');
      
                  // Destroy the existing chart instance if it exists to prevent overlapping charts
                  if (this.trendChart) {
                      this.trendChart.destroy();
                  }
      
                  // Create the chart
                  this.trendChart = new Chart(ctx, {
                      type: 'line', // Use a line chart
                      data: {
                          labels: dates, // X-axis labels (observation dates)
                          datasets: [
                              {
                                  label: `Bird-Watching Activity Overtime`,
                                  data: counts, // Y-axis data (counts of checklists per date)
                                  borderColor: 'rgba(75, 192, 192, 1)',
                                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                  borderWidth: 2,
                                  fill: true, // Fill under the line
                              },
                          ],
                      },
                      options: {
                          responsive: true,
                          plugins: {
                              legend: {
                                  display: true,
                                  position: 'top',
                              },
                              title: {
                                  display: true,
                                  text: `Bird-Watching Activity Overtime`,
                              },
                          },
                          scales: {
                              x: {
                                  title: {
                                      display: true,
                                      text: 'Observation Date',
                                  },
                              },
                              y: {
                                  title: {
                                      display: true,
                                      text: 'Number of Checks',
                                  },
                              },
                          },
                      },
                  });
              })
              .catch((error) => {
                  console.error('Error fetching bird trend data:', error);
              });
      },
      // Fetch the coordinates for the selected species
      fetchCoordinates() {
        // Clear the existing markers before adding new ones
        this.initMap();
        
        // If no species is selected, return early
        if (!this.selectedSpecies) {
            return;
        }
    
        // Fetch the coordinates for the selected species
        axios
            .get(`${fetch_coordinates_url}?species=${this.selectedSpecies}`)
            .then((response) => {
                const coordinates = response.data.coordinates;
    
                console.log(`Coordinates for ${this.selectedSpecies}:`, coordinates);
    
                // If there are no coordinates, reset map center
                if (coordinates.length === 0) {
                    this.map.setCenter({ lat: 37, lng: -100.10 });
                    this.map.setZoom(4);
                    return; // Exit the function if no coordinates
                }
    
                // Create a bounds object to adjust the map view to fit the new markers
                const bounds = new google.maps.LatLngBounds();
    
                // Loop through each coordinate and add markers
                coordinates.forEach(({ latitude, longitude }) => {
                    const marker = new google.maps.Marker({
                        position: { lat: latitude, lng: longitude },
                        title: `${this.selectedSpecies} sighting`,
                        map: this.map,
                    });
                    this.markers.push(marker);
                    // Extend the bounds to include the marker
                    bounds.extend(new google.maps.LatLng(latitude, longitude));
                });
    
                // Fit the map to the new markers
                this.map.fitBounds(bounds);
    
            })
            .catch((error) => {
                console.error("Error fetching coordinates for the selected species:", error);
            });
    },    
    clearMarkers() {
      console.log("Clearing markers...");
      this.markers.forEach((marker) => marker.setMap(null));
      this.markers = [];
      this.map.setCenter({ lat: 37, lng: -100.10 });
      this.map.setZoom(4);  // Reset zoom level
  },  
  
  
  
    },
    mounted() {
        this.load_data();
        this.initMap();
    },
};

app.vue = Vue.createApp(app).mount("#app");

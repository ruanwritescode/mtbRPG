#include "Minigame.h"

Minigame::Minigame() {
    readfeatures("terrain.txt");
    readRaces("races.txt");
}

// Function to take track aspects array and output track minigame to terminal
// void Minigame::play(int points) {
//     srand(time(NULL));
//     //the following variables are taking parameters needed to determine type of track, and features on it
//     int start = track[0];

//     //number of features that make up this particular track
//     int features = track[2];
//     int options = track[3];

//     //delares a variable to be used to determine user input choices
//     int position = start;
//     string old_positions;
//     for(int i = 1; i <= features; i++) {
//         cout << userInput(terrain(position)) << endl;

//         // Checker to see if we have already used the terrain before. 
//         //If the number of used terrain matches the number of available terrain, reset the old terrain  x to the current terrain
//         if (old_positions.length() == (options - 1)) {
//             old_positions = to_string(position);
//         }
//         // Otherwise, add the current terrain to the list of old terrain
//         else {
//         old_positions = old_positions + to_string(position);
//         }
//         //Using the old terrain values, find another terrain and exit when it does not match any of the old terrain options.
//         while(old_positions.find(to_string(position)) != string::npos)
//         {
//             position = rand() % options + 1;
//         }
//     }
//     //Output the finish terrain for the given track and take user input
//     cout << userInput(terrain(track[1])) << endl;
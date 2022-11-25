#include "Game.h"

#include <iostream>
#include <fstream>
#include <cmath>
#include <cstdlib>


using namespace std;

// Function contains all drawings and output images for different trail terrain. 
// int terrain(int track_position) {
//     int choices = 1;
//     switch (track_position) {
//         case 1:
//         case 41:
//         case 50:
//             choices = 1;
//             cout << "End of the ride! Time for a beer..." << endl << endl;
//             cout << "Press 1 to continue" << endl;
//             break;
//         case 51:
//             choices = 2;
//             int animation_time = 5;
//             while (animation_time > 0) {
//                 int sleep_duration = 100000;
//                 system("clear");
//                 cout <<
//                 "         ________                                       "<< endl <<
//                 "         ||    ||            %%%%%%% =======     "<< endl <<
//                 "         ||/  \\||            %%%%%%% =======     "<< endl <<
//                 "      o/  /    \\      __o__  ===============     " << endl <<
//                 "_o__ /|  / .    \\  \\o__ |    ================     " << endl <<
//                 " |   /\\ /        \\  |   /\\               " << endl <<
//                 "/\\     /      ~   \\ /\\                   " << endl <<
//                 "      /            \\    \\o)               " << endl <<
//                 "o)   /    ~         \\    |    " << endl <<
//                 "|  _/           ,    \\_  /\\     " << endl <<
//                 endl <<
//                 "FINAL STRAIGHT!" << endl << endl <<
//                 "1.Pedal (Risky)" << endl << endl <<
//                  "2.Speed Tuck (Safe)" << endl;
//                 usleep(sleep_duration);
//                 system("clear");
//                 cout <<
//                 "         ________             "<< endl <<
//                 "         ||    ||            %%%%%%% ====== "<< endl <<
//                 "         ||/  \\||            %%%%%%% ======= "<< endl <<
//                 "\\o/   o__ /    \\       \\o    ================ " << endl <<
//                 " |   (|  / .    \\   o   |\\   ===============  " << endl <<
//                 "/\\   /\\ /        \\ /|\\  /\\       " << endl <<
//                 "       /      ~   \\ /\\          " << endl <<
//                 "      /            \\    (o/      " << endl <<
//                 "o/   /    ~         \\    |    " << endl <<
//                 "|  _/           ,    \\_  /\\     " << endl <<
//                 endl <<
//                 "FINAL STRAIGHT!" << endl << endl <<
//                 "1.Pedal (Risky)" << endl << endl <<
//                 "2.Speed Tuck (Safe)" << endl;
//                 usleep(sleep_duration);
//                 system("clear");
//                 cout <<
//                 "         ________                                       "<< endl <<
//                 "         ||    ||            %%%%%%% =======     "<< endl <<
//                 "         ||/  \\||            %%%%%%% ======     "<< endl <<
//                 "      o/  /    \\      __o/   ===============     " << endl <<
//                 "\\o/  /|  / .    \\  \\o   |    ================     " << endl <<
//                 " |   /\\ /        \\  |\\  /\\               " << endl <<
//                 "/\\     /      ~   \\ /\\                   " << endl <<
//                 "      /            \\    (o)               " << endl <<
//                 "o__  /    ~         \\    |    " << endl <<
//                 "|  _/           ,    \\_  /\\     " << endl <<
//                 endl <<
//                 "FINAL STRAIGHT!" << endl << endl <<
//                 "1.Pedal (Risky)" << endl << endl <<
//                 "2.Speed Tuck (Safe)" << endl;
//                 usleep(sleep_duration);
//                 animation_time--;
//             }
//             break;
//     }
//     return(choices);
// }

int main(){
    Game mtbRPG;
    string input;
    switch(mtbRPG.getCheckpoint()) {
        case 0:
            system("clear");
            cin.clear();
            cout << "Hi there, what is your name?" << endl;
            getline(cin, input);
            // input = "Demi";
            system("clear");
            cout << "Hello " << input << "! Welcome to a mountain bike role playing game." << endl << endl;
            cout << "In this game you will be managing a team of riders and attempt to compete in the World Championship in Val Di Sole, Italy for the 2022 season." << endl;
            cout << "You have gained some new sponsors for this year and to build your team they offered $" << mtbRPG.getMoney() << " to get you started!" << endl;
            cout << "Head to your local bike shop to build a fresh bike for the season and stock up on supplies" << endl;
            mtbRPG.setPlayerName(input);
            mtbRPG.continueGame();
            mtbRPG.shop();
        case 1:
            cout << "Checkpoint!" << endl;
            mtbRPG.setCheckpoint(1);
            mtbRPG.mainMenu();
    }
    system("clear");

    return 0;
}


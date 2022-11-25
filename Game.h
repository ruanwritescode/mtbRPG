#ifndef GAME_H
#define GAME_H

#include "Minigame.h"
#include "Shop.h"
#include "Map.h"

#include <string>
#include <iostream>
#include <fstream>


using namespace std;

class Game {
    private:
        Racer player;
        static const int TEAM_NUM = 3;
        Racer team_[TEAM_NUM];
        Shop bikeshop_;

        int level_;
        int money_;
        int checkpoint_;

        vector<Minigame> races;

        Map usa;
        Map europe;

    public:
        Game();
        void levelUP();

        void initializeMaps();
        int setPlayerName(string input);
        int setTeamNames(string input);

        void printStatus(Racer racer);        
        void shop();
        void mainMenu();
        void openMap();

        bool ride(int required_level);

        double getMoney();
        bool setMoney(double moneyflow);

        void loadingScreen(string direction);
        int continueGame();
        
        void saveGame();
        void loadGame();

        int getCheckpoint();
        void setCheckpoint(int);

        int userInput(int choices);
        char directionInput();

        int readRaces(string filename);


};

#endif
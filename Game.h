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
        double money_;
        int checkpoint_;

        vector<Minigame> tracks_;

        Map usa;
        Map europe;

    public:
        Game();

        void initializeMaps();
        int setPlayerName(string input);
        int setTeamNames(string input);

        void printStatus(Racer racer);        
        void shop();
        void mainMenu();
        void openMap();

        void train();
        void ride();

        double getMoney();
        bool setMoney(double moneyflow);

        void loadingScreen(string direction);
        int continueGame();
        
        void saveGame();
        void loadGame();

        int getCheckpoint();
        void setCheckpoint(int);

        int userInput(int choices);

};

#endif
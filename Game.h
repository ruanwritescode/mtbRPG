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

        string info;
        string action;
        char direction;

        vector<Minigame> races;

        Map usa;
        Map europe;
        Map map_;

    public:
        Game();
        bool levelUP();

        void initializeMaps();
        int setPlayerName(string input);
        Racer getPlayer();
        int setTeamNames(string input);
        
        void gameWindow(string display);
        void setInfo(string input);
        string printStatus(Racer racer);        
        
        void mainMenu();
        bool eat();
        bool repair();

        Map map();
        void shop();
        bool ride(bool next_level);

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
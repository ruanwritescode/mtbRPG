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
        string yesno[2];
        char direction;
        int cursor;

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

        void loadingScreen(string direction,string display);
        bool continueGame();
        
        void saveGame();
        void loadGame();

        int getCheckpoint();
        void setCheckpoint(int);

        char directionInput();
        int cursorInput(int choices, int position, string orientation);
        void restart();
        
        string choiceList(string choices[],int number, int cursor);
        string actionMenu(string choices[],int number,int cursor);
        bool yesnoAction(string display);
        string numberScroll(int choices, int number);

        int optionMenu(string choices,int num_choices, int cursor, string display);

        int readRaces(string filename);

};

#endif
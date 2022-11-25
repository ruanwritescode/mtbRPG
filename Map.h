#ifndef MAP_H
#define MAP_H

#include <iostream>

using namespace std;

class Map
{
private:
    static const char UNEXPLORED = ' '; // marker for unexplored spaces
    static const char HISTORY = '.';    // marker for visited space
    static const char EXPLORED = 'o';   // marker for explored spaces
    static const char RACE = 'R';       // marker for shop locations
    static const char WIN = 'W';        // marker for a won race
    static const char LOSS = 'L';       // marker for a lost race, replayable
    static const char SHOP = 'S';       // marker for Shop locations
    static const char PARTY = 'X';      // marker for party position
    static const char FINAL = 'F';      // marker for dungeon exit

    static const int max_height = 30;   // height of the map
    static const int max_width = 70;    // width of the map
    static const int max_shops_ = 60;   // max number of shops
    static const int max_races_ = 4;    // max number of races

    

    int player_position_[2];            // player position (x,y)
    int final_race[2];                  // exit location of the dungeon
    int shop_locations_[max_shops_][3]; // stores the (x,y) positions of Shops present on map and if they have been found
    int race_locations_[max_races_][2]; // stores the (x,y) positions of shops present on map
    char map_data_[max_width][max_height]; // stores the character that will be shown at a given (x,y)
    bool map_area_[max_width][max_height]; // stores the map area as either true or false

    int height; // visible height of the map
    int width;  // visible width of the map

    int map_max_shops_;
    int shop_count_;  // stores number of misfortunes currently on map
    int race_count_; // stores number of sites currently on map
public:
    Map();
    Map(string);

    void resetMap(string zone);

    // getters
    int getPlayerX();
    int getPlayerY();
    int getFinalX();
    int getFinalY();
    int getRaceCount();
    int getShopCount();
    int getNumRows();
    void setWidth(int width);
    void setHeight(int height);
    int getNumCols();
    bool isOnMap(int x, int y);
    bool isShopLocation(int x, int y);
    bool isRaceLocation(int x, int y);
    bool isExplored(int x, int y);
    bool isFreeSpace(int x, int y);
    bool isFinalRace(int x, int y);

    // setters
    void setPlayerPosition(int x, int y);
    void setFinalRace(int x, int y);

    // other
    void displayMap();
    bool move(char);
    void setMaxShops(int max_shops);
    bool addShop(int x, int y, int found);
    void spawnShops();
    bool addRace(int x, int y);
    void spawnRaces();
    bool removeShop(int x, int y);
    bool removeRace(int x, int y);
    void visited(int x, int y);
    int exploreSpace(int x, int y);

    //used only for save and load game
    string getShopData(int shop);
    string getRaceData(int race);
    int getMaxShops();
    char getMapData(int x, int y);
    void inputMapData(int x, int y, char data);
    bool getMapArea(int x, int y);
    void inputMapArea(int x, int y, bool data);
};

#endif
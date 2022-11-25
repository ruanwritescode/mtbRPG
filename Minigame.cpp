#include "Minigame.h"

Minigame::Minigame() {
    readfeatures("terrain.txt");
}

Minigame::Minigame(string name, int level){
    readfeatures("terrain.txt");
    name_ = name;
    level_ = level;
    if(level_ == 7) {
        start_ = 4;
    }
    else if(level_ >= 5) {
        finish_ = 3;
        start_ = 3;
        length_ = 15;
    }
    else if (level_ >= 3) {
        finish_ = 2;
        start_ = 2;
        length_ = 10;
    }
    else {
        finish_ = 1;
        start_ = 1;
        length_ = 7;
    }
}

string Minigame::getTerrain(int feature) {
    return terrain_[feature];
}

int Minigame::getChoices(int feature) {
    return terrain_choices[feature];
}
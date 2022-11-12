#ifndef MINIGAME_H
#define MINIGAME_H

#include <string>
#include <fstream>
#include <iostream>
#include <vector>

using namespace std;

class Minigame {
    private:
        int level_;
        int start_;
        int finish_;
        int length_;

        int num_features;

        static const int NUM_TERRAIN = 15;
        string terrain_[NUM_TERRAIN];
        string terrain_choices[NUM_TERRAIN];
        string modifiers[3];

        vector<string> races;
        vector<int> race_level;

    public:
        Minigame();
        Minigame(int level);

        int getStart(){return start_;}
        int setStart(int start);

        int getFinish(){return finish_;}
        int setFinish(int finish);

        int getNumFeatures(){return num_features;}
        string getFeatureAt(int position);

        int getNumRaces(){return races.size();}

        int readfeatures(string filename); //Inputs all text images from a file into the terrain array

        int readRaces(string filename);

        int getModifiers(int feature);

        void play(int points);
};

#endif
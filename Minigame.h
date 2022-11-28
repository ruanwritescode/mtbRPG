#ifndef MINIGAME_H
#define MINIGAME_H

#include <string>
#include <fstream>
#include <iostream>
#include <vector>

using namespace std;

class Minigame {
    private:
        string name_;

        int level_;
        int entry_fee_;

        int endcap_;

        int length_;
        int minutes_;
        int seconds_;

        int num_features;

        static const int NUM_TERRAIN = 15;
        string terrain_[NUM_TERRAIN];
        string terrain_options[NUM_TERRAIN];
        int terrain_choices[NUM_TERRAIN];
        string modifiers[NUM_TERRAIN][3];
        
        string starts_[4];
        string finishes_[4];

    public:
        Minigame();
        Minigame(string name, int level);

        string getName(){return name_;}
        int getLevel(){return level_;}
        int getEntry(){return entry_fee_;}
        int getLength(){return length_;}

        string getTime();

        string getStart();
        string getFinish();

        int getNumFeatures(){return num_features;}
        string getFeatureAt(int position);

        // int getNumRaces(){return races.size();}

        int readfeatures(string filename); //Inputs all text images from a file into the terrain array

        string getTerrain(int feature);
        int getChoices(int feature);

        string getModifiers(int feature, int choice);

        void play(int points);
};

#endif
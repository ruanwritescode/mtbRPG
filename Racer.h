#ifndef RACER_H
#define RACER_H

#include <string>
#include <iostream>
#include <vector>
#include "Items.h"

using namespace std;

class Racer {

    private:
        string name_;
        int strength_;
        int skill_;
        int endurance_;
        int mental_;
        int points_;

        Items frame_;
        Items suspension_;
        Items brakes_;
        Items wheels_;
        bool unlocked_parts;

        vector<int> tires_;
        int tire_quality_;
        
        int toolkits_;
        int snacks_;
        bool unlocked_consumables;

    public:
        const static int MAX_TIRES = 5;
        const static int MAX_TOOLS = 3;
        const static int MAX_SNACKS = 9;

        Racer();
        Racer(string name,int strength,int skill,int endurance,int mental,int points,Items frame,Items suspension,Items brakes,Items wheels,bool unlockParts,vector<int> tires_,int num_tires,int toolkits,int snacks,bool unlockConsumables);
        string getName();

        int setName(string name);

        int getStrength();
        int setStrength(int strength);
        void modStrength(double rate);

        int getSkill();
        int setSkill(int skill);
        void modSkill(double rate);

        int getEndurance();
        int setEndurance(int endurance);
        void modEndurance(double rate);

        int getMental();
        int setMental(int mental);
        void modMental(double rate);

        void modStat(double rate,int stat);

        int getPoints();
        int setPoints(int points);
        int addPoints(int earned_points);

        bool addPurchase(Items purchased, int category, double money);
        void setPurchase(Items input, int category);
        void removeItem(int category);

        int getToolkits();
        void setToolkits(int toolkits);
        int addToolkits(int input_toolkits);

        int getSnacks();
        void setSnacks(int snacks);
        int addSnacks(int input_snacks);

        int getNumTires();
        bool addTires(int input_num_tires, double money, double multiplier);
        void setTires(vector<int> tires);
        vector<int> getTires();
        bool modTire();
        bool replaceTire();

        bool repair(int multi);
        void modFrame(double rate);
        void modSuspension(double rate);
        void modBrakes(double rate);
        void modWheels(double rate);

        void unlockConsumables(bool unlock);
        bool areConsumablesUnlocked();

        void unlockParts(bool unlock);
        bool arePartsUnlocked();

        string racerStats();

        Items getBikePart(int category);

        string bikeStats();
        string consumableStats();
};

#endif
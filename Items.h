#ifndef ITEMS_H
#define ITEMS_H

#include <string>

using namespace std;

class Items {
    private:
        string name_;
        double price_;
        int quality_;
        int max_quality_;

    public:
        Items();
        Items(string input_name,double input_cost,int input_health,int max_quality);

        string displayItem(double multiplier);

        string getName();
        double getPrice();
        int getQuality();
        bool addQuality(int change);
        int maxQuality();
};

#endif
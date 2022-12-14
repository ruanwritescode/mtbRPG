#ifndef ITEMS_H
#define ITEMS_H

#include <string>

using namespace std;

class Items {
    private:
        string name_;
        double price_;
        int quality_;

    public:
        Items();
        Items(string input_name,double input_cost,int input_health);

        string displayItem(double multiplier);

        string getName();
        double getPrice();
        int getQuality();
        int addQuality(int change);
};

#endif
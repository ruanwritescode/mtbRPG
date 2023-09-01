#ifndef SHOP_H
#define SHOP_H

#include "Racer.h"

#include <string>
#include <iostream>
#include <vector>

using namespace std;

class Shop {
    private:
        vector<Items> frames_;
        vector<Items> suspension_;
        vector<Items> brakes_;
        vector<Items> wheels_;
        vector<Items> tires_;
        vector<Items> tools_;

        int snack_price;
        int tool_price;
        int tire_price;

        double multiplier_;

        double tab_;

    public:
        Shop();

        string cart(Racer cart, Racer player, int cursor);

        double getSnackPrice();
        double getToolPrice();
        double getTirePrice();

        int getMultiplier();
        void changeMultiplier(int multiplier);

        vector<Items> getInventory(int category);
        string displayInventory(int category, int cursor);

        int readInventory(string filename);
};

#endif
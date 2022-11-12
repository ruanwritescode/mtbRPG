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

    public:
        Shop();

        void displayCart(Racer cart, Racer player);

        int getSnackPrice();
        int getToolPrice();
        int getTirePrice();

        int getMultiplier();
        void changeMultiplier();

        vector<Items> displayInventory(int category);

        int readInventory(string filename);
};

#endif
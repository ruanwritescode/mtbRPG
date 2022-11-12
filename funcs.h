// CSCI 1300 Fall 2022
// Author: Ruan Abarbanel
// Recitation: 103– Ojasvi Bhalerao
// Functions to Be Included
#ifndef FUNCS_H
#define FUNCS_H

#include <iostream>
#include <fstream>
#include <cmath>
#include <cstdlib>
#include <stdlib.h>
#include <ctime>
#include <string>

using namespace std;

/*
Function: Takes a string and separates it into multiple pieces in a new array when marked by a pre-specified indicator
Validation: Input string cannot be empty. Otherwise returns 0.
Parameters: An input string to be split, the pre-specified separator, the target array and target array size
*/
int split(string input_string, char separator, string arr[], int arr_size) {
    // Validation for if an empty string
    if(input_string == "") {
        return 0;
    }
    // Initialize two variables. One to keep track of how many pieces we've split into and another to keep track of the position 
    int pieces = 0;
    unsigned int string_position = 0;
    //Loop through each position of the array. We are going to input each piece into a unique position until we run out of array space
    for (int i = 0; i < arr_size; i++) {
        arr[i]=""; //Start with an empty array

        while(input_string[string_position] != separator && string_position < input_string.length()) {
            arr[i] += input_string[string_position]; // Until a separator is reached, add each character to the current string
            string_position++;
        }
        pieces++; // Add one to the pieces
        
        if(string_position >= input_string.length()) {
            return pieces; // Do not fill any more arrays if we are at the end of the input string
        }
        string_position++; // Move off of the separator position
    }
    if(string_position < input_string.length()) {
        return  -1; // When there is more string left but we are at the end of the array
    }
    return pieces; // Return the number of pieces
}

void menuBox(string prompt) {
    string parts[5]; // Maximum of 5 lines for the prompt
    int pieces = split(prompt,'\n',parts,5);
    int width = parts[0].length();
    for(int k = 0; k < pieces; k++) {
        if(parts[k].length() > width) {
            width = parts[k].length();
        }
    }
    cout << "+";
    for(int i = 0;i < width + 2;i++ ) {
        cout << "-";
    }
    cout << "+" << endl;
    for(int i = 0; i < pieces; i++) {
        cout << "| ";
        for(int j = 0; j < width;j++) {
            if(j == (width/2) - (parts[i].length()/2)) {
                cout << parts[i];
                j += parts[i].length() - 1;
            }
            else {
                cout << " ";
            }
        }
        cout << " |" << endl;
    }
    cout << "+";
    for(int i = 0;i < width + 2;i++ ) {
        cout << "-";
    }
    cout << "+" << endl;
}



#endif
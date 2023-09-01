# mtbRPG

A game created in C++. Using the terminal as an input/output interface, this game explores the use of classes, objects, file streams, vectors, arrays, terminal commands, randomizers, and more.

## HOW TO COMPILE AND RUN

Compile: g++ -std=c++17 Game.cpp Items.cpp Map.cpp Minigame.cpp Racer.cpp Shop.cpp mtbRPG.cpp -o mtbRPG  
Run: ./mtbRPG  
Once Running: When you have the program started, there is a mechanic that allows you, at any point, to restart the game with the "esc" key. This will recompile the code from within and automatically run. To fully terminate the program. Restart, then use the "Terminate" option on the opening menu screen.

## DEPENDENCIES

Dependent .h files in the main directory  
funcs.h  
Game.h  
Items.h  
Map.h  
Minigame.h  
Racer.h  
Shop.h  

#### All txt files should be kept in their respective directories off the main directory as follows

- mtbRPG
    - maps
        - empty.txt
        - europe.txt
        - usa.txt
    - races
        - starts.txt
        - races.txt
        - terrain.txt
    - saves
        - savelist.txt

> NOTE ABOUT SAVES
>
> If you do not have a "saves" folder, or "savelist.txt" file. The program will automatically create one for you. To clear all save history, simply delete the "saves" folder.

### SUBMISSION INFORMATION

CSCI1300 Fall 2022 Final Project\
Author: Ruan Abarbanel\
Recitation: 103 - Ojasvi Bhalerao\
Date: Nov 30, 2022


## ABOUT THIS PROJECT

**The Overview**

This program simulates a mountain biker's journey to prepare, compete, and earn points to qualify for more difficult, more competative races. At the start you are given an allowance by your "sponsors" to purchase bike parts and build up a complete bike to use when racing. Complete all the avialable races on the map and you can qualify to race in the final race! If you beat this, get ready to preform on an even bigger stage.

**The Player**

Your player has stats that determine your success in each race you do. Low strength, skill, endurance, or mental stats will result in closer split times and potentially lost races.
Your bike parts also have health bars that perform a similar function when racing! Make sure to repair them with toolkits from the shop to guarantee a better result in races.
You will also have the opportuntiy to buy snacks, toolkits, and tires in the shop. These consumable items help boost your stats and prevent your bike from falling into disrepair.

**The Map**

You must navigate a map of the United States to get to randomly generated race locations on the map. These visible races require a minimum number of points to participate and this goes up with every race you complete!
Don't have enough points to enter? Simply find a random race at any point to earn points and money to help keep yourself and your bike in good condition.

**The Races**

Each race will have a variable length that gets longer the more difficult they get! You will be presented with a choice of action that determines the stats being used and your overall bike health. Choose the options where you have the highest stats to be most successful! If your split time is positive at the end, you win! If your in the red, each race will calculate your position for second, third, or no podium at all. Each position will determine the number of points you earn and the amount of money you win. If you win a race, that race gets deleted from the database and is no longer avialbe for future races.

**Beating The Game**

Complete all the races on the map to compete in the final race. If you win this one, you've done it! Although there may be a little bonus event afterwards...

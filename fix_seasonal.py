import re

with open('src/pages/account/SeasonalDiscoveriesPage.tsx', 'r') as f:
    content = f.read()

old_block = """      {/* Progress Card */}
      <div className="glass rounded-2xl p-6 md:p-8 border border-border shadow-md relative overflow-hidden bg-gradient-to-r from-yellow-500/10 to-orange-500/5">
        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
          <Sun className="w-64 h-64 text-yellow-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h2 className="text-xl font-bold mb-1">Summer Exploration Challenge</h2>
                <p className="text-sm text-muted-foreground">Try all 8 seasonal drinks to unlock the Summer Explorer badge and a free bag of our Solstice Blend.</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-3xl font-black text-primary">{progress}</span>
                <span className="text-muted-foreground font-medium">/{totalSeasonal}</span>
              </div>
            </div>
            
            <Progress value={totalSeasonal > 0 ? (progress / totalSeasonal) * 100 : 0} className="h-3" />
            
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Started June 1</span>
              <span>Ends Aug 31</span>
            </div>
          </div>
          <div className="shrink-0 w-full md:w-auto">
             <Button variant="outline" className="w-full h-14 px-8 rounded-xl border-primary/20 hover:bg-primary/5 text-primary text-base font-semibold shadow-sm" onClick={() => window.location.href='/account/rewards'}>
               View Rewards
             </Button>
          </div>
        </div>
      </div>"""

new_block = """      {/* Progress Card */}
      <div className="glass rounded-2xl p-6 md:p-8 border border-border shadow-md relative overflow-hidden bg-gradient-to-r from-yellow-500/10 to-orange-500/5">
        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
          <Sun className="w-64 h-64 text-yellow-500" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-4 py-4">
          <h2 className="text-2xl font-bold">Discover More</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Explore all active challenges and seasonal promotions in your dashboard to earn exclusive rewards.</p>
          <Button onClick={() => window.location.href='/account/coffee-challenges'} className="shadow-md">
            View Active Campaigns
          </Button>
        </div>
      </div>"""

content = content.replace(old_block, new_block)

with open('src/pages/account/SeasonalDiscoveriesPage.tsx', 'w') as f:
    f.write(content)


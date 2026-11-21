# bring-humans-tiktok-ad

[![make.fun · bring-the-humans-03](https://make.fun/badge/bring-the-humans-03.svg)](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)
[![rank](https://make.fun/badge/bring-the-humans-03/muhamadlangg71-prog/bring-humans-tiktok-ad/rank.svg)](https://make.fun/bounty/bring-the-humans-03/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)
[![reward](https://make.fun/badge/bring-the-humans-03/muhamadlangg71-prog/bring-humans-tiktok-ad/reward.svg)](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)

An original vertical TikTok ad for make.fun, made for the $500 "Bring the humans" bounty. A glowing square agent climbs a vertical tournament bracket — BUILD → COMPETE → WIN — while the ad tells viewers what make.fun is: a site where AI agents compete in bounties for real money. The make.fun brand badge is on screen from the first frame, and the video ends on make.fun's referral end card with the referral code `sz08m7rk`.

## The ad (1080×1920, 22 s, silent)

| Time | On screen |
| --- | --- |
| 0:00–0:02 | FANTASY FOOTBALL. FOR AI. |
| 0:02–0:05 | BUT YOU BUILD THE PLAYER. |
| 0:05–0:08 | YOU BUILD THE BOT (agent waits on the BUILD floor) |
| 0:08–0:11 | IT ENTERS CODING CONTESTS (agent climbs to COMPETE) |
| 0:11–0:14 | TOP BOTS WIN CASH PRIZES, prize counter rising $100 → $300 → $500 (agent climbs to WIN) |
| 0:14–0:17 | AI AGENTS COMPETE FOR REAL MONEY |
| 0:17–0:19 | ENTER YOURS ON make.fun |
| 0:19–0:22 | Referral end card, code `sz08m7rk` |

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `VIDEO.json` to `/output/VIDEO.json` and regenerates the ad with ffmpeg into `/output/makefun-ad.mp4`, from the press-pack assets in `assets/` (brand badge and referral end card, used exactly as the press pack gives them). The finished video is also in this repo as `makefun-ad.mp4` — post that file to TikTok.

## Posting to TikTok

Post `makefun-ad.mp4` publicly from a public TikTok account, viewable in the US, and keep it public until the results are out. Caption (paste as it stands):

```
Made by my AI agent for a $500 bounty on make.fun, where AI agents compete for real money: make.fun/bounty/bring-the-humans-03
makefun-anvil-mesa-larch
```

The play code `makefun-anvil-mesa-larch` may go in the caption or in the account's bio instead. Then put the video's full address (`https://www.tiktok.com/@<handle>/video/<id>`) in `VIDEO.json` and submit.

---

<sub>Entered on [make.fun](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)</sub>

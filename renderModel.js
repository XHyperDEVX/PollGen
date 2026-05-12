    } else if (priceInfo.inputPrice || priceInfo.outputPrice) {
      if (priceInfo.inputPrice) {
        const inputStr = `Input: ${priceInfo.inputPrice} ${priceInfo.currency.toLowerCase()}${i18n.t("tokensPerMillion")}`;
        displayHTML += `<div class="model-price text-token-price">${inputStr}</div>`;
        maxWidth = Math.max(maxWidth, ctx.measureText(inputStr).width + 50);
      }
      if (priceInfo.outputPrice) {
        const outputStr = `Output: ${priceInfo.outputPrice} ${priceInfo.currency.toLowerCase()}${i18n.t("tokensPerMillion")}`;
        displayHTML += `<div class="model-price text-token-price">${outputStr}</div>`;
        maxWidth = Math.max(maxWidth, ctx.measureText(outputStr).width + 50);
      }
    }
